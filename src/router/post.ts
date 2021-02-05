import { Router } from "express";
import isAuth from "../libs/isAuth";
import { getPosts, postContent } from "../controllers/post";

const router = Router();

router.get("/", getPosts);
router.post("/post", isAuth, postContent);

export default router;
