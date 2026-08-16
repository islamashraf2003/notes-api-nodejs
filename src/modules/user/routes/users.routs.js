import { Router } from "express";
import { signUp } from "../controllers/users.controllers.js";

const userRoute = Router();

userRoute.post("/sign-up", signUp)
export default userRoute;

