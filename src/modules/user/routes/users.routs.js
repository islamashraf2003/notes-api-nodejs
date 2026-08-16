import { Router } from "express";
import { signUp, signIn } from "../controllers/users.controllers.js";
import { validateSignUp } from "../../../middleware/validateSignUp.js";
import { validateSignIn } from "../../../middleware/validateSignIn.js";

const userRoute = Router();

userRoute.post("/sign-up", validateSignUp, signUp)
userRoute.post("/sign-in", validateSignIn, signIn)
export default userRoute;

