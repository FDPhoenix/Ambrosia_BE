const User = require('../models/User');
const UserRole = require("../models/UserRole");
const Feedback = require('../models/Feedback');
const Dish = require('../models/Dish');

exports.getLineChartData = async (req, res) => {
    try {
      const currentDate = new Date();
      const year = req.query.year ? parseInt(req.query.year) : currentDate.getFullYear();
  
      if (isNaN(year)) {
        return res.status(400).json({ message: 'Invalid year parameter' });
      }
  
      const data = await User.aggregate([
        {
          $match: {
            createdAt: {
              $gte: new Date(`${year}-01-01T00:00:00Z`),  // Đảm bảo thời gian chuẩn
              $lte: new Date(`${year}-12-31T23:59:59Z`)
            },
            isActive: true
          }
        },
        {
          $group: {
            _id: { $month: '$createdAt' },
            count: { $sum: 1 }
          }
        },
        {
          $sort: { '_id': 1 }
        }
      ]);
  
      const monthlyData = Array(12).fill(0);
      data.forEach(item => {
        monthlyData[item._id - 1] = item.count;
      });
  
      res.json({
        months: Array.from({ length: 12 }, (_, i) => i + 1),
        subscribers: monthlyData,
        year: year
      });
    } catch (error) {
      res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
  };
  

exports.getBarChartData = async (req, res) => {
  try {
    const currentDate = new Date();
    const year = req.query.year || currentDate.getFullYear();
    const month = req.query.month || String(currentDate.getMonth() + 1).padStart(2, '0');

    const daysInMonth = new Date(year, month, 0).getDate();
    
    const data = await User.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(`${year}-${month}-01`),
            $lte: new Date(`${year}-${month}-${daysInMonth}`)
          },
          isActive: true
        }
      },
      {
        $group: {
          _id: { $dayOfMonth: '$createdAt' },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id': 1 }
      }
    ]);

    const dailyData = Array(daysInMonth).fill(0);
    data.forEach(item => {
      dailyData[item._id - 1] = item.count;
    });

    res.json({
      days: Array.from({ length: daysInMonth }, (_, i) => i + 1),
      subscribers: dailyData,
      year: parseInt(year),
      month: parseInt(month)
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

const ROLE_IDS = {
    admin: "67ac64afe072694cafa16e76",
    customer: "67ac64bbe072694cafa16e78",
    staff: "67ac64c7e072694cafa16e7a",
    chef: "67ac667ae072694cafa16e7c"
  };
  
  exports.getUserCounts = async (req, res) => {
    try {
      const activeUserIds = await User.find({ isActive: true }).distinct("_id");
  
      const totalUsers = activeUserIds.length;

      const adminCount = await UserRole.countDocuments({
        userId: { $in: activeUserIds },
        roleId: ROLE_IDS.admin
      });
  
      const customerCount = await UserRole.countDocuments({
        userId: { $in: activeUserIds },
        roleId: ROLE_IDS.customer
      });
  
      const staffCount = await UserRole.countDocuments({
        userId: { $in: activeUserIds },
        roleId: ROLE_IDS.staff
      });
  
      const chefCount = await UserRole.countDocuments({
        userId: { $in: activeUserIds },
        roleId: ROLE_IDS.chef
      });
  
      res.json({
        totalUsers,
        adminCount,
        customerCount,
        staffCount,
        chefCount
      });
    } catch (error) {
      res.status(500).json({ message: "Lỗi server", error: error.message });
    }
  };
  
exports.getFeedbackCount = async (req, res) => {
  try {
    const { year, month, day } = req.query;
    const currentDate = new Date();
    
    let startDate, endDate;
    
    if (year && month && day) {

      startDate = new Date(`${year}-${month}-${day}T00:00:00Z`);
      endDate = new Date(`${year}-${month}-${day}T23:59:59Z`);
    } else if (year && month) {

      const daysInMonth = new Date(year, month, 0).getDate();
      startDate = new Date(`${year}-${month}-01T00:00:00Z`);
      endDate = new Date(`${year}-${month}-${daysInMonth}T23:59:59Z`);
    } else if (year) {

      startDate = new Date(`${year}-01-01T00:00:00Z`);
      endDate = new Date(`${year}-12-31T23:59:59Z`);
    } else {

      const currentYear = currentDate.getFullYear();
      startDate = new Date(`${currentYear}-01-01T00:00:00Z`);
      endDate = new Date(`${currentYear}-12-31T23:59:59Z`);
    }

    const totalFeedback = await Feedback.countDocuments({
      createdAt: { $gte: startDate, $lte: endDate },
      isHided: false
    });

    res.json({
      totalFeedback,
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        year: year || currentDate.getFullYear(),
        month: month || null,
        day: day || null
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

exports.getFeedbackByDish = async (req, res) => {
  try {
    const { year, month, day } = req.query;
    const currentDate = new Date();
    
    let startDate, endDate;
    
    if (year && month && day) {
      startDate = new Date(`${year}-${month}-${day}T00:00:00Z`);
      endDate = new Date(`${year}-${month}-${day}T23:59:59Z`);
    } else if (year && month) {
      const daysInMonth = new Date(year, month, 0).getDate();
      startDate = new Date(`${year}-${month}-01T00:00:00Z`);
      endDate = new Date(`${year}-${month}-${daysInMonth}T23:59:59Z`);
    } else if (year) {
      startDate = new Date(`${year}-01-01T00:00:00Z`);
      endDate = new Date(`${year}-12-31T23:59:59Z`);
    } else {
      const currentYear = currentDate.getFullYear();
      startDate = new Date(`${currentYear}-01-01T00:00:00Z`);
      endDate = new Date(`${currentYear}-12-31T23:59:59Z`);
    }

    const feedbackStats = await Feedback.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          isHided: false
        }
      },
      {
        $lookup: {
          from: 'dishes',
          localField: 'dish_id',
          foreignField: '_id',
          as: 'dish'
        }
      },
      {
        $unwind: '$dish'
      },
      {
        $group: {
          _id: '$dish_id',
          dishName: { $first: '$dish.name' },
          dishImage: { $first: '$dish.imageUrl' },
          totalFeedback: { $sum: 1 },
          averageRating: { $avg: '$rating' },
          ratingDistribution: {
            $push: '$rating'
          }
        }
      },
      {
        $project: {
          dishName: 1,
          dishImage: 1,
          totalFeedback: 1,
          averageRating: { $round: ['$averageRating', 1] },
          ratingDistribution: 1,
          percentage: 1 
        }
      },
      {
        $sort: { totalFeedback: -1 }
      }
    ]);


    const totalFeedbackCount = feedbackStats.reduce((sum, item) => sum + item.totalFeedback, 0);


    const result = feedbackStats.map(item => ({
      ...item,
      percentage: totalFeedbackCount > 0 ? Math.round((item.totalFeedback / totalFeedbackCount) * 100) : 0
    }));

    res.json({
      feedbackStats: result,
      totalFeedback: totalFeedbackCount,
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        year: year || currentDate.getFullYear(),
        month: month || null,
        day: day || null
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

exports.getFeedbackPieChartData = async (req, res) => {
  try {
    const { year, month, day } = req.query;
    const currentDate = new Date();
    
    let startDate, endDate;
    
    if (year && month && day) {
      startDate = new Date(`${year}-${month}-${day}T00:00:00Z`);
      endDate = new Date(`${year}-${month}-${day}T23:59:59Z`);
    } else if (year && month) {
      const daysInMonth = new Date(year, month, 0).getDate();
      startDate = new Date(`${year}-${month}-01T00:00:00Z`);
      endDate = new Date(`${year}-${month}-${daysInMonth}T23:59:59Z`);
    } else if (year) {
      startDate = new Date(`${year}-01-01T00:00:00Z`);
      endDate = new Date(`${year}-12-31T23:59:59Z`);
    } else {
      const currentYear = currentDate.getFullYear();
      startDate = new Date(`${currentYear}-01-01T00:00:00Z`);
      endDate = new Date(`${currentYear}-12-31T23:59:59Z`);
    }

    const pieChartData = await Feedback.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          isHided: false
        }
      },
      {
        $lookup: {
          from: 'dishes',
          localField: 'dish_id',
          foreignField: '_id',
          as: 'dish'
        }
      },
      {
        $unwind: '$dish'
      },
      {
        $group: {
          _id: '$dish_id',
          name: { $first: '$dish.name' },
          value: { $sum: 1 },
          averageRating: { $avg: '$rating' },
          dishImage: { $first: '$dish.imageUrl' }
        }
      },
      {
        $sort: { value: -1 }
      },
      {
        $limit: 10
      }
    ]);

    console.log('Pie chart aggregate result:', pieChartData);

    const total = pieChartData.reduce((sum, item) => sum + item.value, 0);


    const colors = [
      '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
      '#FF9F40', '#C9CBCF', '#4BC0C0', '#FF6384', '#00C49F',
      '#FFB347', '#B19CD9', '#FFD700', '#FF7F50', '#6495ED',
      '#DC143C', '#008B8B', '#B8860B', '#006400', '#8B008B',
      '#FF4500', '#2E8B57', '#A0522D', '#D2691E', '#5F9EA0',
      '#7FFF00', '#D2691E', '#FF1493', '#1E90FF', '#FFDAB9',
      '#E9967A', '#8FBC8F', '#483D8B', '#00CED1', '#9400D3',
      '#FF6347', '#4682B4', '#008080', '#B22222', '#228B22',
      '#DAA520', '#ADFF2F', '#F08080', '#20B2AA', '#87CEFA',
      '#778899', '#B0C4DE', '#FFFFE0', '#00FA9A', '#48D1CC',
      '#C71585', '#191970', '#FFE4E1', '#FFE4B5', '#FFDEAD',
      '#6A5ACD', '#708090', '#00FF7F', '#4682B4', '#D2B48C',
      '#008080', '#D8BFD8', '#FF6347', '#40E0D0', '#EE82EE',
      '#F5DEB3', '#F5F5DC', '#F5F5F5', '#FFFF00', '#9ACD32'
    ];

    const result = pieChartData.map((item, index) => ({
      ...item,
      percentage: total > 0 ? Math.round((item.value / total) * 100) : 0,
      averageRating: Math.round(item.averageRating * 10) / 10,
      color: colors[index % colors.length],
      dishImage: item.dishImage || '',
    }));

    res.json({
      pieChartData: result,
      totalFeedback: total,
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        year: year || currentDate.getFullYear(),
        month: month || null,
        day: day || null
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error server', error: error.message });
  }
};
  