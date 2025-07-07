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
  
// Thêm function mới để thống kê tổng số feedback theo ngày tháng năm
exports.getFeedbackCount = async (req, res) => {
  try {
    const { year, month, day } = req.query;
    const currentDate = new Date();
    
    let startDate, endDate;
    
    if (year && month && day) {
      // Lọc theo ngày cụ thể
      startDate = new Date(`${year}-${month}-${day}T00:00:00Z`);
      endDate = new Date(`${year}-${month}-${day}T23:59:59Z`);
    } else if (year && month) {
      // Lọc theo tháng
      const daysInMonth = new Date(year, month, 0).getDate();
      startDate = new Date(`${year}-${month}-01T00:00:00Z`);
      endDate = new Date(`${year}-${month}-${daysInMonth}T23:59:59Z`);
    } else if (year) {
      // Lọc theo năm
      startDate = new Date(`${year}-01-01T00:00:00Z`);
      endDate = new Date(`${year}-12-31T23:59:59Z`);
    } else {
      // Mặc định là năm hiện tại
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

// Thêm function để thống kê feedback theo từng món ăn
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
          percentage: 1 // Sẽ tính sau
        }
      },
      {
        $sort: { totalFeedback: -1 }
      }
    ]);

    // Tính tổng số feedback để tính phần trăm
    const totalFeedbackCount = feedbackStats.reduce((sum, item) => sum + item.totalFeedback, 0);

    // Thêm phần trăm cho mỗi món ăn
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

// Thêm function để lấy dữ liệu cho biểu đồ tròn
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
          color: { $first: '$dish.imageUrl' } // Có thể thay bằng màu ngẫu nhiên
        }
      },
      {
        $sort: { value: -1 }
      },
      {
        $limit: 10 // Chỉ lấy top 10 món ăn có nhiều feedback nhất
      }
    ]);

    // Tính tổng để tính phần trăm
    const total = pieChartData.reduce((sum, item) => sum + item.value, 0);

    // Thêm phần trăm và màu ngẫu nhiên
    const colors = [
      '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
      '#FF9F40', '#FF6384', '#C9CBCF', '#4BC0C0', '#FF6384'
    ];

    const result = pieChartData.map((item, index) => ({
      ...item,
      percentage: total > 0 ? Math.round((item.value / total) * 100) : 0,
      averageRating: Math.round(item.averageRating * 10) / 10, // Làm tròn đến 1 chữ số thập phân
      color: colors[index % colors.length]
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
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};
  