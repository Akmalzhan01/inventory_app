const express = require("express")
const Product = require("../models/Product")
const Sale = require("../models/Sale");
const Salary = require("../models/Salary");
const Borrow = require("../models/Borrow");

const router = express.Router()



router.get("/:year/:month", async (req, res) => {
  try {
    const { year, month } = req.params;

    // Yil va oyga mos keladigan mahsulotlarni olish
    const products = await Product.find({
      $expr: {
        $and: [
          { $eq: [{ $year: "$createdAt" }, parseInt(year)] },
          { $eq: [{ $month: "$createdAt" }, parseInt(month)] }
        ]
      }
    }).select("price quantity");

    // Umumiy summani hisoblash
    const totalProduct = products.reduce((sum, product) => {
      return sum + (product.price * product.quantity);
    }, 0);

    const sales = await Sale.find({
      $expr: {
        $and: [
          { $eq: [{ $year: "$saleDate" }, parseInt(year)] },
          { $eq: [{ $month: "$saleDate" }, parseInt(month)] },
        ]
      }
    }).select("total paidAmount");

    const totalSaleTotal = sales.reduce((sum, sale) => {
      return sum + (sale.total);
    }, 0);

    const totalSalePaidAmount = sales.reduce((sum, sale) => {
      return sum + (sale.paidAmount);
    }, 0);

    const salaries = await Salary.find({
      $expr: {
        $and: [
          { $eq: [{ $year: "$paymentDate" }, parseInt(year)] },
          { $eq: [{ $month: "$paymentDate" }, parseInt(month)] }
        ]
      }
    }).select("netSalary");

    const totalSalary = salaries.reduce((sum, salary) => {
      return sum + (salary.netSalary);
    }, 0)


    const borrows = await Borrow.find({
      $expr: {
        $and: [
          { $eq: [{ $year: "$createdAt" }, parseInt(year)] },
          { $eq: [{ $month: "$createdAt" }, parseInt(month)] }
        ]
      }
    }).select("paidAmount items.price items.quantity");

    const totalBorrowPaidAmount = borrows.reduce((sum, borrow) => {
      return sum + (borrow.paidAmount);
    }, 0)



    const borrowsWithItemsTotal = borrows.map(borrow => {
      const itemsTotal = borrow.items.reduce((sum, item) => {
        return sum + (item.price * item.quantity);
      }, 0);

      return {
        ...borrow,
        itemsTotal: itemsTotal
      };
    });

    // Barcha borrows uchun itemslarning umumiy summasini hisoblash
    const totalItemsSum = borrowsWithItemsTotal.reduce((sum, borrow) => {
      return sum + borrow.itemsTotal;
    }, 0);

    res.status(200).json({
      sum: {
        products: {
          totalProduct,
        },
        sales: {
          totalSaleTotal,
          totalSalePaidAmount,
          totalCredit: totalSaleTotal - totalSalePaidAmount,
        },
        salary: {
          totalSalary,
        },
        borrow: {
          totalItemsSum,
          totalBorrowPaidAmount,
          remider: totalItemsSum - totalBorrowPaidAmount,
        }
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server xatosi" });
  }
});
module.exports = router