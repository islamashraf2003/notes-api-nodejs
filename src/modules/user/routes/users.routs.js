import { Router } from "express";
import { signUp, signIn } from "../controllers/users.controllers.js";
import { validateSignUp } from "../../../middleware/validateSignUp.js";

const userRoute = Router();

userRoute.post("/sign-up", validateSignUp, signUp)
userRoute.post("/sign-in", signIn)
export default userRoute;

