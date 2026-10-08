import { Router } from "express";
import { getCurrentProgram, publishProgram } from "../controllers/program.controller.js";
import { verifyJwt } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/current").get(getCurrentProgram);
router.route("/").post(verifyJwt, publishProgram);

export default router;
