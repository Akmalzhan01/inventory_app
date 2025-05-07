const express = require("express")
const Product = require("../models/Product")
const Sale = require("../models/Sale");
const Salary = require("../models/Salary");
const Borrow = require("../models/Borrow");
const Expend = require("../models/Expend");

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



    const sales = await Sale.find({
      $expr: {
        $and: [
          { $eq: [{ $year: "$saleDate" }, parseInt(year)] },
          { $eq: [{ $month: "$saleDate" }, parseInt(month)] },
        ]
      }
    }).populate('customer', 'name phone')
      .populate('seller', 'name')
      .populate('items.product', 'name sku price')
      .select("total paidAmount items");

    const totalSale = sales.reduce((acc, sale) => {
      // Сумма total всех продаж
      acc.totalSaleSum += sale.total;
      
      // Сумма paidAmount всех продаж
      acc.paidAmountSaleSum += sale.paidAmount;
      
      // Сумма оригинальных цен продуктов (price * quantity)
      const originalSum = sale.items.reduce((sum, item) => {
        return sum + (item.product.price * item.quantity);
      }, 0);
      
      acc.originalPriceSaleSum += originalSum;
      
      return acc;
    }, {
      totalSaleSum: 0,
      paidAmountSaleSum: 0,
      originalPriceSaleSum: 0
    });

    const expend = await Expend.find({
      $expr: {
        $and: [
          { $eq: [{ $year: "$date" }, parseInt(year)] },
          { $eq: [{ $month: "$date" }, parseInt(month)] }
        ]
      }
    }).select("price");

    const totalExpend = expend.reduce((sum, item) => {
      return sum + (item.price);
    }, 0)

    res.status(200).json({
      sum: {
        products: {
          totalProduct,
        },
        sale: {
          totalSale,
          credit: totalSale.totalSaleSum - totalSale.paidAmountSaleSum,
        },
        salary: {
          totalSalary,
        },
        borrow: {
          totalItemsSum,
          totalBorrowPaidAmount,
          remider: totalItemsSum - totalBorrowPaidAmount,
        },
        expend: {
          totalExpend
        }
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server xatosi" });
  }
});
module.exports = router