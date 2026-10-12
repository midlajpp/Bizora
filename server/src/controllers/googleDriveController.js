const { google } = require('googleapis');
const { Readable } = require('stream');
const User = require('../models/User');
const Invoice = require('../models/Invoice');

/**
 * Creates and returns Google OAuth2 Client
 */
const getOAuth2Client = (customRedirectUri) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri =
    customRedirectUri ||
    process.env.GOOGLE_REDIRECT_URI ||
    `${process.env.CLIENT_URL || 'http://localhost:5173'}/profile`;

  if (!clientId || !clientSecret) {
    return null;
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
};

// @desc    Get Google OAuth 2.0 Authorization URL
// @route   GET /api/google-drive/auth-url
// @access  Private
const getAuthUrl = async (req, res, next) => {
  try {
    const oauth2Client = getOAuth2Client(req.query.redirectUri);

    if (!oauth2Client) {
      return res.status(400).json({
        success: false,
        message:
          'Google Drive credentials not configured. Please add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to the backend environment variables.'
      });
    }

    const statePayload = {
      userId: req.user._id.toString(),
      nonce: Math.random().toString(36).substring(2)
    };

    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent', // Force consent so a refresh_token is always issued
      scope: ['https://www.googleapis.com/auth/drive.file'],
      state: Buffer.from(JSON.stringify(statePayload)).toString('base64url')
    });

    res.json({
      success: true,
      url
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Handle OAuth callback redirect from Google
// @route   GET /api/google-drive/callback
// @access  Public (Validated via state)
const handleCallback = async (req, res, next) => {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

  try {
    const { code, state, error } = req.query;

    if (error) {
      return res.redirect(`${clientUrl}/profile?drive_error=${encodeURIComponent(error)}`);
    }

    if (!code || !state) {
      return res.redirect(`${clientUrl}/profile?drive_error=missing_code_or_state`);
    }

    let parsedState = {};
    try {
      parsedState = JSON.parse(Buffer.from(state, 'base64url').toString('utf8'));
    } catch (e) {
      return res.redirect(`${clientUrl}/profile?drive_error=invalid_state`);
    }

    const user = await User.findById(parsedState.userId);
    if (!user) {
      return res.redirect(`${clientUrl}/profile?drive_error=user_not_found`);
    }

    const oauth2Client = getOAuth2Client(
      `${req.protocol}://${req.get('host')}/api/google-drive/callback`
    );

    if (!oauth2Client) {
      return res.redirect(`${clientUrl}/profile?drive_error=oauth_unconfigured`);
    }

    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    let driveEmail = 'Connected Google Account';
    try {
      const drive = google.drive({ version: 'v3', auth: oauth2Client });
      const about = await drive.about.get({ fields: 'user' });
      if (about.data.user?.emailAddress) {
        driveEmail = about.data.user.emailAddress;
      }
    } catch (aboutErr) {
      // Non-fatal, fallback to generic
    }

    user.googleDrive = {
      isConnected: true,
      email: driveEmail,
      accessToken: tokens.access_token || '',
      refreshToken: tokens.refresh_token || user.googleDrive?.refreshToken || '',
      expiryDate: tokens.expiry_date || null,
      connectedAt: new Date()
    };

    await user.save();

    return res.redirect(`${clientUrl}/profile?drive=connected`);
  } catch (err) {
    console.error('[Google Drive Callback Error]:', err);
    return res.redirect(
      `${clientUrl}/profile?drive_error=${encodeURIComponent(err.message || 'auth_failed')}`
    );
  }
};

// @desc    Exchange authorization code for tokens (frontend direct callback)
// @route   POST /api/google-drive/exchange-code
// @access  Private
const exchangeCode = async (req, res, next) => {
  try {
    const { code, redirectUri } = req.body;

    if (!code) {
      return res.status(400).json({ success: false, message: 'Authorization code is required' });
    }

    const oauth2Client = getOAuth2Client(redirectUri);
    if (!oauth2Client) {
      return res.status(400).json({
        success: false,
        message: 'Google Drive OAuth credentials are not configured on the backend.'
      });
    }

    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    let driveEmail = 'Connected Google Account';
    try {
      const drive = google.drive({ version: 'v3', auth: oauth2Client });
      const about = await drive.about.get({ fields: 'user' });
      if (about.data.user?.emailAddress) {
        driveEmail = about.data.user.emailAddress;
      }
    } catch (aboutErr) {
      // Non-fatal
    }

    const user = await User.findById(req.user._id).select('+googleDrive.refreshToken');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.googleDrive = {
      isConnected: true,
      email: driveEmail,
      accessToken: tokens.access_token || '',
      refreshToken: tokens.refresh_token || user.googleDrive?.refreshToken || '',
      expiryDate: tokens.expiry_date || null,
      connectedAt: new Date()
    };

    await user.save();

    res.json({
      success: true,
      message: 'Google Drive connected successfully',
      data: {
        isConnected: true,
        email: driveEmail,
        connectedAt: user.googleDrive.connectedAt
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Google Drive connection status
// @route   GET /api/google-drive/status
// @access  Private
const getStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('+googleDrive.refreshToken');

    const isConnected = !!(user?.googleDrive?.isConnected && user?.googleDrive?.refreshToken);

    res.json({
      success: true,
      data: {
        isConnected,
        email: user?.googleDrive?.email || '',
        connectedAt: user?.googleDrive?.connectedAt || null
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Disconnect Google Drive
// @route   POST /api/google-drive/disconnect
// @access  Private
const disconnectDrive = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('+googleDrive.refreshToken');

    if (user && user.googleDrive?.refreshToken) {
      try {
        const oauth2Client = getOAuth2Client();
        if (oauth2Client) {
          await oauth2Client.revokeToken(user.googleDrive.refreshToken);
        }
      } catch (revokeErr) {
        // Continue even if Google token already expired or revoked
      }
    }

    if (user) {
      user.googleDrive = {
        isConnected: false,
        email: '',
        accessToken: '',
        refreshToken: '',
        expiryDate: null,
        connectedAt: null
      };
      await user.save();
    }

    res.json({
      success: true,
      message: 'Google Drive disconnected successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Upload or update invoice PDF in user's Google Drive
// @route   POST /api/google-drive/upload-invoice/:invoiceId
// @access  Private
const uploadInvoicePdf = async (req, res, next) => {
  try {
    const { invoiceId } = req.params;

    // Verify invoice ownership
    let invoiceQuery = { _id: invoiceId };
    if (req.user.role !== 'admin') {
      invoiceQuery.userId = req.user._id;
    }
    const invoice = await Invoice.findOne(invoiceQuery);

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    // Verify user's Google Drive connection
    const user = await User.findById(req.user._id).select(
      '+googleDrive.refreshToken +googleDrive.accessToken +googleDrive.expiryDate'
    );

    if (!user?.googleDrive?.isConnected || !user?.googleDrive?.refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Google Drive is not connected. Please connect Google Drive in Settings first.'
      });
    }

    // Get PDF Buffer from multipart or base64 body
    let pdfBuffer = null;
    if (req.file && req.file.buffer) {
      pdfBuffer = req.file.buffer;
    } else if (req.body.pdfBase64) {
      const cleanBase64 = req.body.pdfBase64.replace(/^data:application\/pdf;base64,/, '');
      pdfBuffer = Buffer.from(cleanBase64, 'base64');
    }

    if (!pdfBuffer || pdfBuffer.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No PDF data received. Please provide a valid invoice PDF file or base64 buffer.'
      });
    }

    // Authenticate OAuth client with user tokens
    const oauth2Client = getOAuth2Client();
    if (!oauth2Client) {
      return res.status(400).json({
        success: false,
        message: 'Google Drive OAuth credentials are not configured on the backend.'
      });
    }

    oauth2Client.setCredentials({
      refresh_token: user.googleDrive.refreshToken,
      access_token: user.googleDrive.accessToken
    });

    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    // 1. Find or create root folder: "Bizora Invoices"
    let bizoraFolderId = null;
    const folderRes = await drive.files.list({
      q: "name = 'Bizora Invoices' and mimeType = 'application/vnd.google-apps.folder' and trashed = false",
      fields: 'files(id, name)',
      spaces: 'drive'
    });

    if (folderRes.data.files && folderRes.data.files.length > 0) {
      bizoraFolderId = folderRes.data.files[0].id;
    } else {
      const createFolderRes = await drive.files.create({
        requestBody: {
          name: 'Bizora Invoices',
          mimeType: 'application/vnd.google-apps.folder'
        },
        fields: 'id'
      });
      bizoraFolderId = createFolderRes.data.id;
    }

    // 2. Find or create year subfolder: e.g. "2026"
    const invoiceYear = new Date(invoice.invoiceDate || Date.now()).getFullYear().toString();
    let yearFolderId = null;
    const yearFolderRes = await drive.files.list({
      q: `name = '${invoiceYear}' and '${bizoraFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: 'files(id, name)',
      spaces: 'drive'
    });

    if (yearFolderRes.data.files && yearFolderRes.data.files.length > 0) {
      yearFolderId = yearFolderRes.data.files[0].id;
    } else {
      const createYearRes = await drive.files.create({
        requestBody: {
          name: invoiceYear,
          mimeType: 'application/vnd.google-apps.folder',
          parents: [bizoraFolderId]
        },
        fields: 'id'
      });
      yearFolderId = createYearRes.data.id;
    }

    // 3. Check for existing file with same invoice number to avoid duplicates
    const fileName = `${invoice.invoiceNumber}.pdf`;
    const existingFileRes = await drive.files.list({
      q: `name = '${fileName}' and '${yearFolderId}' in parents and trashed = false`,
      fields: 'files(id, name, webViewLink)',
      spaces: 'drive'
    });

    const mediaStream = new Readable();
    mediaStream.push(pdfBuffer);
    mediaStream.push(null);

    const media = {
      mimeType: 'application/pdf',
      body: mediaStream
    };

    let uploadedFile = null;

    if (existingFileRes.data.files && existingFileRes.data.files.length > 0) {
      // Update existing file content and metadata
      const existingFileId = existingFileRes.data.files[0].id;
      uploadedFile = await drive.files.update({
        fileId: existingFileId,
        media: media,
        fields: 'id, name, webViewLink, webContentLink'
      });
    } else {
      // Create new file inside year subfolder
      uploadedFile = await drive.files.create({
        requestBody: {
          name: fileName,
          parents: [yearFolderId]
        },
        media: media,
        fields: 'id, name, webViewLink, webContentLink'
      });
    }

    const fileId = uploadedFile.data.id;
    const webViewLink =
      uploadedFile.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`;

    // 4. Update Invoice record
    invoice.googleDriveFile = {
      fileId,
      fileName,
      webViewLink,
      uploadedAt: new Date()
    };
    await invoice.save();

    res.json({
      success: true,
      message: `Invoice ${invoice.invoiceNumber} saved to Google Drive successfully`,
      data: {
        fileId: invoice.googleDriveFile.fileId,
        fileName: invoice.googleDriveFile.fileName,
        webViewLink: invoice.googleDriveFile.webViewLink,
        uploadedAt: invoice.googleDriveFile.uploadedAt
      }
    });
  } catch (error) {
    console.error('[Google Drive Upload Error]:', error);
    next(error);
  }
};

module.exports = {
  getAuthUrl,
  handleCallback,
  exchangeCode,
  getStatus,
  disconnectDrive,
  uploadInvoicePdf
};
