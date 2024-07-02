import express from 'express';
import { protectedRoute } from '../middlewares/authMiddleware.js';
import multer from 'multer';
import path from 'path';
import User from '../models/userModel.js';
import Post from '../models/postModel.js';
import { unlink } from 'fs';

const router = express.Router();

// set up storage engine using multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

// Initilize upload variable with the storage engine
const upload = multer({ storage: storage });

// route for home page
router.get('/', async (req, res) => {

  const page = parseInt(req.query.page) || 1;
  const limit = 2;

  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;

  const totalPosts = await Post.countDocuments().exec();

  const posts = await Post.find()
    .populate({ path: 'user', select: '-password' })
    .sort({ _id: -1 })
    .limit(limit)
    .skip(startIndex)
    .exec();

  const pagination = {
    currentPage: page,
    totalPage: Math.ceil(totalPosts / limit),
    hasNextPage: endIndex < totalPosts,
    hasPrevPage: startIndex > 0,
    nextPage: page + 1,
    prevPage: page - 1
  };

  res.render('index', { title: 'Home Page', active: 'home', posts, pagination });
});

// route for my posts page
router.get('/my-posts', protectedRoute, async (req, res) => {

  try {

    const userId = req.session.user._id;
    const user = await User.findById(userId).populate('posts');

    if (!user) {
      req.flash('error', 'User not found!');
      return res.redirect('/');
    }

    res.render('posts/my-posts', {
      title: 'My Posts',
      active: 'my_posts',
      posts: user.posts
    });

  } catch (error) {
    console.error(error);
    req.flash('error', 'An error occurred while fetching your posts!');
    res.redirect('/my-posts');
  }


});


// route for create new post page
router.get('/create-post', protectedRoute, (req, res) => {
  res.render('posts/create-post', { title: 'Create Post', active: 'create_post' });
});

// route for edit post page
router.get('/edit-post/:id', protectedRoute, async (req, res) => {
  try {

    const postId = req.params.id;
    const post = await Post.findById(postId);

    if (!post) {
      req.flash('error', 'Post not found!');
      return res.redirect('/my-posts');
    }

    res.render('posts/edit-post', { title: 'Edit Post', active: 'edit_post', post });

  } catch (error) {
    console.error(error);
    req.flash('error', 'Something went wrong!');
    res.redirect('/my-posts');
  }

});

// handle update a post request
router.post('/update-post/:id', protectedRoute, upload.single('image'), async (req, res) => {
  try {

    const postId = req.params.id;
    const post = await Post.findById(postId);

    if (!post) {
      req.flash('error', 'Post not found!');
      return res.redirect('/my-posts');
    }

    post.title = req.body.title;
    post.content = req.body.content;
    post.slug = req.body.title.replace(/\s+/g, '-').toLowerCase();

    if (req.file) {
      unlink(path.join(process.cwd(), 'uploads') + '/' + post.image, (err) => {
        if (err) {
          console.error(err);
        }
      });
      post.image = req.file.filename;
    }

    await post.save();
    req.flash('success', 'Post updated successfully!');
    res.redirect('/my-posts');

  } catch (error) {
    console.error(error);
    req.flash('error', 'Something went wrong!');
    res.redirect('/my-posts');
  }
});

// route for view post in detail
router.get('/post/:slug', async (req, res) => {
  try {

    const slug = req.params.slug;
    const post = await Post.findOne({ slug }).populate('user');

    if (!post) {
      req.flash('error', 'Post not found!');
      return res.redirect('/my-posts');
    }

    res.render('posts/view-post', { title: 'View Post', active: 'view_post', post });

  } catch (error) {
    console.error(error);
    req.flash('error', 'Something went wrong!');
    res.redirect('/my-posts');
  }

});


// handle create new post request
router.post('/create-post', protectedRoute, upload.single('image'), async (req, res) => {
  try {

    const { title, content } = req.body;
    const image = req.file.filename;
    const slug = title.replace(/\s+/g, '-').toLowerCase();

    const user = await User.findById(req.session.user._id);

    // create new post
    const post = new Post({ title, slug, content, image, user });

    // save post in user posts array
    await User.updateOne({ _id: req.session.user._id }, { $push: { posts: post._id } });

    await post.save();

    req.flash('success', 'Post created successfully!');
    res.redirect('/my-posts');

  } catch (error) {
    console.error(error);
    req.flash('error', 'Something went wrong!');
    res.redirect('/create-post');
  }
});

// handle delete post request
router.post('/delete-post/:id', protectedRoute, async (req, res) => {
  try {

    const postId = req.params.id;
    const post = await Post.findById(postId);

    if (!post) {
      req.flash('error', 'Post not found!');
      return res.redirect('/my-posts');
    }

    await User.updateOne({ _id: req.session.user._id }, { $pull: { posts: postId } });
    await Post.deleteOne({ _id: postId });

    unlink(path.join(process.cwd(), 'uploads') + '/' + post.image, (err) => {
      if (err) {
        console.error(err);
      }
    });

    req.flash('success', 'Post deleted successfully!');
    res.redirect('/my-posts');

  } catch (error) {
    console.error(error);
    req.flash('error', 'Something went wrong!');
    res.redirect('/my-posts');
  }
});


export default router;