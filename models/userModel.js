import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  token: String,
  createdAt: {
    type: Date,
    default: new Date(),
  },
  posts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
  }]
});

const User = mongoose.model('User', userSchema);
export default User;