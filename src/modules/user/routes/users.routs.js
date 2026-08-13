import { Router } from "express";
import { allUsers } from "../controllers/users.controllers.js";

const userRoute = Router();

userRoute.get('/', allUsers)

export default userRoute;

