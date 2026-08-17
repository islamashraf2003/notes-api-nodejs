import { Router } from "express";
import { signUp, signIn } from "../controllers/users.controllers.js";
import { validateSignUp } from "../../../middleware/validateSignUp.js";
import { validateSignIn } from "../../../middleware/validateSignIn.js";
import { rateLimit } from "../../../middleware/rateLimit.js";

const userRoute = Router();

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 });

userRoute.post("/sign-up", authLimiter, validateSignUp, signUp);
userRoute.post("/sign-in", authLimiter, validateSignIn, signIn);

export default userRoute;
