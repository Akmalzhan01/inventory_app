const express = require("express");
const router = express.Router();
const Expend = require("../models/Expend");

router.post("/", async (req, res) => {
  const { name, price, date, category } = req.body;
  try {
    const newExpend = new Expend({
      name,
      price,
      date,
      category,
    });
    await newExpend.save();
    res.status(201).json(newExpend);
  } catch (error) {
    res.status(500).json({ message: "Server xatosi" });
  }
})


router.get("/", async (req, res) => {
  try {
    const expends = await Expend.find();
    res.status(200).json(expends);
  } catch (error) {
    res.status(500).json({ message: "Server xatosi" });
  }
})

router.get("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const expend = await Expend.findById(id);
    if (!expend) {
      return res.status(404).json({ message: "Expend topilmadi" });
    }
    res.status(200).json(expend);
  } catch (error) {
    res.status(500).json({ message: "Server xatosi" });
  }
})

router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { name, price, date, category } = req.body;
  try {
    const expend = await Expend.findByIdAndUpdate(
      id,
      { name, price, date, category },
      { new: true }
    );
    if (!expend) {
      return res.status(404).json({ message: "Expend topilmadi" });
    }
    res.status(200).json(expend);
  } catch (error) {
    res.status(500).json({ message: "Server xatosi" });
  }
})

router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const expend = await Expend.findByIdAndDelete(id);
    if (!expend) {
      return res.status(404).json({ message: "Expend topilmadi" });
    }
    res.status(200).json({ message: "Expend o'chirildi" });
  } catch (error) {
    res.status(500).json({ message: "Server xatosi" });
  }
})

module.exports = router;