import { Router } from "express";
import { signUp } from "../controllers/users.controllers.js";
import { validateSignUp } from "../../../middleware/validateSignUp.js";

const userRoute = Router();

userRoute.post("/sign-up", validateSignUp, signUp)
export default userRoute;

