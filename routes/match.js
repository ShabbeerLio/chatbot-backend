import express from "express";
import { fetchUser } from "../middleware/fetchUser.js";
import User from "../models/User.js";
import { dateRangeFromAge } from "../utils/dateRangeFromAge.js";

const router = express.Router();

const calculateAge = (dob) => {
  if (!dob?.year) return null;

  const monthIndex = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ].indexOf(dob.month) || 0;

  const birthDate = new Date(dob.year, monthIndex, dob.day || 1);
  const today = new Date();

  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
};

/**
 * 🔍 Find Matches
 * Example: GET /api/match/find?gender=Female&religion=Muslim&city=Delhi&minAge=20&maxAge=35
 */
router.get("/find", fetchUser, async (req, res) => {
  try {
    const { gender, religion, sect, city, state, minAge, maxAge } = req.query;
    const filter = {};

    if (gender) filter.gender = gender;
    if (religion) filter.religion = religion;
    if (sect) filter.sect = sect;
    if (city) filter.city = city;
    if (state) filter.state = state;

    // Age filter
    if (minAge && maxAge) {
      const { minYear, maxYear } = dateRangeFromAge(Number(minAge), Number(maxAge));
      filter["dob.year"] = { $gte: String(minYear), $lte: String(maxYear) };
    }

    filter._id = { $ne: req.user.id };

    const matches = await User.find(filter)
      .select("name city profession gender profilePic height religion sect caste dob")
      .limit(50);

    res.json(matches);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error finding matches" });
  }
});

/**
 * 📍 Get Nearby Users
 * - Opposite gender
 * - Same city
 * - Age within ±5 years
 */
router.get("/nearby", fetchUser, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ msg: "User not found" });

    const userAge = new Date().getFullYear() - Number(user.dob.year);
    const minAge = userAge - 5;
    const maxAge = userAge + 5;
    const { minYear, maxYear } = dateRangeFromAge(minAge, maxAge);

    const filter = {
      _id: { $ne: user._id },
      gender: user.gender === "Male" ? "Female" : "Male",
      city: user.city,
      "dob.year": { $gte: String(minYear), $lte: String(maxYear) },
    };

    const candidates = await User.find(filter)
      .select("name city profession gender profilePic height religion sect caste dob interest maritalStatus");

    const results = candidates.map((c) => {
      let score = 0;
      let matchedFields = [];

      const addMatch = (field, label, weight) => {
        if (field) {
          score += weight;
          matchedFields.push(label);
        }
      };

      addMatch(c.religion === user.religion, "Religion", 10);
      addMatch(c.sect === user.sect, "Sect", 8);
      addMatch(c.caste === user.caste, "Caste", 6);
      addMatch(c.maritalStatus === user.maritalStatus, "Marital Status", 5);

      const commonInterests = c.interest?.filter((i) =>
        user.interest?.includes(i)
      ) || [];
      score += commonInterests.length * 2;
      if (commonInterests.length > 0)
        matchedFields.push(`${commonInterests.length} Common Interests`);

      const percentage = Math.min(Math.round((score / 30) * 100), 100);

      return {
        _id: c._id,
        name: c.name,
        gender: c.gender,
        age: calculateAge(c.dob), 
        city: c.city,
        profession: c.profession,
        profilePic: c.profilePic,
        matchPercentage: percentage,
        matchedFields,
      };
    });

    const sortedResults = results.sort(
      (a, b) => b.matchPercentage - a.matchPercentage
    );

    res.json(sortedResults);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error fetching nearby users" });
  }
});

/**
 * 💞 Get "For You" Matches
 * - Opposite gender
 * - Matches maximum attributes
 * - Ignores city/state for broader reach
 */
router.get("/foryou", fetchUser, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ msg: "User not found" });

    const filter = {
      _id: { $ne: user._id },
      gender: user.gender === "Male" ? "Female" : "Male",
      religion: user.religion,
    };

    const candidates = await User.find(filter)
      .select("name city profession gender profilePic height religion sect caste dob qualification family income interest maritalStatus");

    const results = candidates.map((c) => {
      let score = 0;
      let matchedFields = [];

      const addMatch = (field, label, weight) => {
        if (field) {
          score += weight;
          matchedFields.push(label);
        }
      };

      addMatch(c.religion === user.religion, "Religion", 10);
      addMatch(c.sect === user.sect, "Sect", 8);
      addMatch(c.caste === user.caste, "Caste", 6);
      addMatch(c.maritalStatus === user.maritalStatus, "Marital Status", 5);
      addMatch(c.profession === user.profession, "Profession", 4);
      addMatch(c.qualification === user.qualification, "Qualification", 4);
      addMatch(c.family?.type === user.family?.type, "Family Type", 3);
      addMatch(c.income === user.income, "Income", 3);

      // 🔹 Common Interests
      const commonInterests = c.interest?.filter((i) =>
        user.interest?.includes(i)
      ) || [];
      score += commonInterests.length * 2;
      if (commonInterests.length > 0)
        matchedFields.push(`${commonInterests.length} Common Interests`);

      // Calculate % (out of total weight = 45)
      const percentage = Math.min(Math.round((score / 45) * 100), 100);

      return {
        _id: c._id,
        name: c.name,
        gender: c.gender,
        city: c.city,
        age: calculateAge(c.dob), 
        profession: c.profession,
        profilePic: c.profilePic,
        religion: c.religion,
        sect: c.sect,
        caste: c.caste,
        matchPercentage: percentage,
        matchedFields,
      };
    });

    const sortedResults = results.sort(
      (a, b) => b.matchPercentage - a.matchPercentage
    );

    res.json(sortedResults.slice(0, 50));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error fetching 'for you' matches" });
  }
});

/**
 * ❤️ Get My Matches (connected users)
 */
router.get("/my", fetchUser, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate("matches", "name city profilePic profession");
    res.json(user.matches);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 💡 Get Match by ID (with match percentage)
 * Example: GET /api/match/652b1b9d89ab1234efabcd99
 */
router.get("/:id", fetchUser, async (req, res) => {
  try {
    const target = await User.findById(req.params.id).select(
      "name city profession gender profilePic height religion sect caste dob qualification family income interest maritalStatus"
    );

    if (!target) return res.status(404).json({ msg: "User not found" });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ msg: "Current user not found" });

    // 🧮 Calculate match score
    let score = 0;
    let matchedFields = [];

    const addMatch = (field, label, weight) => {
      if (field) {
        score += weight;
        matchedFields.push(label);
      }
    };

    addMatch(target.religion === user.religion, "Religion", 10);
    addMatch(target.sect === user.sect, "Sect", 8);
    addMatch(target.caste === user.caste, "Caste", 6);
    addMatch(target.maritalStatus === user.maritalStatus, "Marital Status", 5);
    addMatch(target.profession === user.profession, "Profession", 4);
    addMatch(target.qualification === user.qualification, "Qualification", 4);
    addMatch(target.family?.type === user.family?.type, "Family Type", 3);
    addMatch(target.income === user.income, "Income", 3);

    // 🔹 Common Interests
    const commonInterests =
      target.interest?.filter((i) => user.interest?.includes(i)) || [];
    score += commonInterests.length * 2;
    if (commonInterests.length > 0)
      matchedFields.push(`${commonInterests.length} Common Interests`);

    // Final percentage
    const percentage = Math.min(Math.round((score / 45) * 100), 100);

    // Return detailed result
    res.json({
      _id: target._id,
      name: target.name,
      gender: target.gender,
      city: target.city,
      profession: target.profession,
      profilePic: target.profilePic,
      height: target.height,
      religion: target.religion,
      sect: target.sect,
      caste: target.caste,
      matchPercentage: percentage,
      matchedFields,
      commonInterests,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error fetching match details" });
  }
});

export default router;