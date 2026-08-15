import { IUser, User, UserDocument } from "./user.model";

export const userRepository = {
  findByEmail(email: string): Promise<UserDocument | null> {
    return User.findOne({ email });
  },

  findById(id: string): Promise<UserDocument | null> {
    return User.findById(id);
  },

  create(data: Partial<IUser>): Promise<UserDocument> {
    return User.create(data);
  },

  incrementTokenVersion(id: string): Promise<UserDocument | null> {
    return User.findByIdAndUpdate(id, { $inc: { tokenVersion: 1 } }, { new: true });
  },
};
