import { Router } from "express";
import { addUser, allUsers, deleteUser } from "../controllers/users.controllers.js";

const userRoute = Router();

userRoute.get('/', allUsers)
userRoute.post('/', addUser)
userRoute.delete('/:id', deleteUser)

export default userRoute;

