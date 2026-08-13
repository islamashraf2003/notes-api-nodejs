import { Router } from "express";
import { addUser, allUsers } from "../controllers/users.controllers.js";

const userRoute = Router();

userRoute.get('/', allUsers)
userRoute.post('/', addUser)

export default userRoute;

