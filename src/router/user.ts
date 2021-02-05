import { Router } from "express";
import multer from "multer";
import isAuth from "../libs/isAuth";

import {
	getUserProfile,
	updateUserProfile,
	settingUserProfile,
} from "../controllers/user";

const upload = multer({ storage: multer.memoryStorage() });
const router = Router();

router.get("/user/profile/:id", getUserProfile);
router.get("/user/profile", isAuth, settingUserProfile);
router.post("/user/profile", upload.single("icon"), isAuth, updateUserProfile);

export default router;
