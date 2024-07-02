import mongoose from 'mongoose';

const postSchema = new mongoose.Schema({
  title: String,
  slug: String,
  content: String,
  image: String,
  createdAt: {
    type: Date,
    default: new Date(),
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }
});

const Post = mongoose.model('Post', postSchema);
export default Post;