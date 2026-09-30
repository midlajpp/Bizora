const Service = require('../models/Service');

// @desc    Get all services for logged-in user
// @route   GET /api/services
// @access  Private
const getServices = async (req, res, next) => {
  try {
    const { search, status } = req.query;
    let query = { userId: req.user._id };

    if (status && ['active', 'inactive'].includes(status)) {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const services = await Service.find(query).sort({ createdAt: -1 });

    res.json({
      success: true,
      count: services.length,
      data: services
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new service
// @route   POST /api/services
// @access  Private
const createService = async (req, res, next) => {
  try {
    const { name, description, rate, status } = req.body;

    if (!name || rate === undefined) {
      return res.status(400).json({ success: false, message: 'Service name and rate are required' });
    }

    const service = await Service.create({
      userId: req.user._id,
      name,
      description: description || '',
      rate: Number(rate),
      status: status || 'active'
    });

    res.status(201).json({
      success: true,
      message: 'Service created successfully',
      data: service
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get service by ID
// @route   GET /api/services/:id
// @access  Private
const getServiceById = async (req, res, next) => {
  try {
    const service = await Service.findOne({ _id: req.params.id, userId: req.user._id });

    if (!service) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }

    res.json({
      success: true,
      data: service
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update service
// @route   PUT /api/services/:id
// @access  Private
const updateService = async (req, res, next) => {
  try {
    const { name, description, rate, status } = req.body;

    let service = await Service.findOne({ _id: req.params.id, userId: req.user._id });

    if (!service) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }

    if (name) service.name = name;
    if (description !== undefined) service.description = description;
    if (rate !== undefined) service.rate = Number(rate);
    if (status) service.status = status;

    const updatedService = await service.save();

    res.json({
      success: true,
      message: 'Service updated successfully',
      data: updatedService
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete service
// @route   DELETE /api/services/:id
// @access  Private
const deleteService = async (req, res, next) => {
  try {
    const service = await Service.findOneAndDelete({ _id: req.params.id, userId: req.user._id });

    if (!service) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }

    res.json({
      success: true,
      message: 'Service deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getServices,
  createService,
  getServiceById,
  updateService,
  deleteService
};
