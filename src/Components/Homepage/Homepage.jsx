import pen from '../../assets/pen.svg';
import upvote from '../../assets/upvote.svg';
import commentPic from '../../assets/comment.svg';
import { useEffect, useState } from 'react';
import {
  addDoc,
  collection,
  getDocs,
  deleteDoc,
  doc,
  query,
  limit,
  orderBy,
  updateDoc,
} from 'firebase/firestore';
import { db, auth } from '../../firebase/firebase-config';
import { Link, useNavigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';

let userProfilePic = localStorage.getItem('userPic');

const Homepage = () => {
  const [fetchedPosts, setFetchedPosts] = useState([]);
  const postsCollectionRef = collection(db, 'posts');

  const q = query(postsCollectionRef, orderBy('timestamp', 'desc'), limit(30));

  let isAuth = localStorage.getItem('isAuth');

  useEffect(() => {
    const getPosts = async () => {
      const data = await getDocs(q);

      setFetchedPosts(
        data.docs.map((doc) => ({
          ...doc.data(),
          id: doc.id,
        }))
      );
    };
    getPosts();
  }, []);

  return (
    <div className="homepage-container">
      {isAuth ? <PostForm /> : ''}

      {fetchedPosts.map((post) => {
        return (
          <PostTemp
            src={post.author.photoURL}
            postName={post.author.name}
            date={post.author.time}
            details={post.postContent}
            id={post.id}
            email={post.author.email}
          />
        );
      })}
    </div>
  );
};

export default Homepage;

const PostForm = () => {
  const [postContent, setPostContent] = useState();
  const postsCollectionRef = collection(db, 'posts');
  let navigate = useNavigate();

  const sendPost = async () => {
    const currentTime = Date.now();
    const dateObj = new Date(currentTime);
    const dayOfWeek = dateObj.toLocaleString('en-US', { weekday: 'short' });
    const timeOfDay = dateObj.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: 'numeric',
      hour12: true,
    });

    await addDoc(postsCollectionRef, {
      author: {
        name: auth.currentUser.displayName,
        id: auth.currentUser.uid,
        photoURL: auth.currentUser.photoURL,
        time: `${dayOfWeek} ${timeOfDay}`,
        email: auth.currentUser.email,
      },
      postContent,
      timestamp: Date.now(),
    });
    navigate('/');
    location.reload();
  };

  return (
    <div className="post-form-container">
      <img src={userProfilePic} />
      <div className="post-form">
        <textarea
          onChange={(e) => {
            setPostContent(e.target.value);
          }}
          className="textarea"
          placeholder="Ask or share something ..."
        />
        <button onClick={sendPost}><img src={pen}/>Post</button>
      </div>
    </div>
  );
};

const PostTemp = ({ src, details, postName, date, id, email }) => {
  const [activeUser, setActiveUser] = useState(false);

  const postCollectionRef = doc(db, 'posts', `${id}`);
  const commentsRef = collection(postCollectionRef, 'comments');
  const [fetchedComments, setFetchedComments] = useState([]);

  onAuthStateChanged(auth, (user) => {
    // if (user) {
    //   setActiveUser(true);
    // } else {
    //   setActiveUser(false);
    // }
    user ? setActiveUser(true) : setActiveUser(false);
  });

  // To get the comments of the post
  useEffect(() => {
    const getPosts = async () => {
      await getDocs(commentsRef).then((querySnapshot) => {
        try {
          setFetchedComments(
            querySnapshot.docs.map((doc) => ({
              ...doc.data(),
              id: doc.id,
            }))
          );
        } catch (error) {
          console.error("Error while fetching data: ", error.message)
        }
      });
    };
    getPosts();
  }, []);

  const docRef = doc(db, `posts/${id}`);

  const deletePost = async () => {
    await deleteDoc(docRef);
    location.reload();
  };

  return (
    <div className="post-temp-container" key={id}>
      <div className="post-header">
        <div className="header-right">
          <img src={src} />

          <div className="post-info">
            <p className="post-name">{postName}</p>
            <p className="post-date">{date}</p>
          </div>
        </div>

        {activeUser ? (
          auth.currentUser.email == email ? (
            <div className="header-actions">
              <button className="header-left" onClick={deletePost}>
                ❌
              </button>
            </div>
            ) : ('')) : ('')}
      </div>

      <PostDetails
        details={details}
        id={id}
        activeUser={activeUser}
        email={email}
      />

      <div className="post-actions">
        <button>
          <img className="upvote" src={upvote} />
          <span>Upvote</span>
        </button>
        {<Link to="/login">
            <button>
              <img src={commentPic} />
            </button>
          </Link>}
      </div>

      <div className="comments">
        <CommentForm activeUser={activeUser} postId={id} />
        <div className="comments-container">
          {fetchedComments.map((comment) => {
            return (
              <CommentTemp
                name={comment.name}
                pic={comment.pic}
                commentContent={comment.commentContent}
                id={comment.id}
                postId={id}
                email={comment.email}
                activeUser={activeUser}
                time={comment.timestamp}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};

const PostDetails = ({ details, id, activeUser, email }) => {
  const [isEditActive, setIsEditActive] = useState(false);
  const [postContent, setPostContent] = useState(details);
  const documentRef = doc(db, 'posts', `${id}`);

  const handleEditPostButton = () => {
    isEditActive ? updatePost() : setIsEditActive(true);
  };

  const handleEditPost = (e) => {
    setPostContent(e.target.value);
  };

  const updatePost = async () => {
    await updateDoc(documentRef, { postContent: postContent });
    location.reload();
  };

  return (
    <div className="post-details-container">
      <p className="post-details">
        {isEditActive ? (
          <textarea onChange={handleEditPost} value={postContent} />
        ) : (
          details
        )}
      </p>

      {activeUser ? (
        auth.currentUser.email == email ? (
          <button onClick={handleEditPostButton}>
            {isEditActive ? 'Save' : 'Edit'}
          </button>) : ('')) : ('')}
    </div>
  );
};

const CommentForm = ({ activeUser, postId }) => {
  const [commentContent, setCommentContent] = useState('');

  const documentRef = doc(db, 'posts', `${postId}`);
  const commentsCollection = collection(documentRef, 'comments');

  const handleCommentContent = (e) => {
    setCommentContent(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await addDoc(commentsCollection, {
        name: auth.currentUser.displayName,
        pic: auth.currentUser.photoURL,
        commentContent: commentContent,
        email: auth.currentUser.email,
        timestamp: Date.now(),
      });
    } catch (error) {
        console.error("Error while fetching data: ", error.message)
    }
    
    location.reload();
  };
  return (
    <div className="comment-form">
      {activeUser ? (
        <form onSubmit={handleSubmit}>
          <input
            onChange={handleCommentContent}
            placeholder="Write a comment"
            className="textarea"
            rows="1"
          />
        </form>):('')}
    </div>
  );
};

const CommentTemp = ({
  name,
  pic,
  commentContent,
  id,
  email,
  activeUser,
  postId,
  time,
}) => {
  const commentRef = doc(db, 'posts', `${postId}`, 'comments', id);
  const deleteComment = async () => {
    await deleteDoc(commentRef);
    location.reload();
  };

  // to get the time
  const dateObj = new Date(time);
  const dayOfWeek = dateObj.toLocaleString('en-US', { weekday: 'short' });
  const timeOfDay = dateObj.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: 'numeric',
    hour12: true,
  });

  const timePosted = `${dayOfWeek} ${timeOfDay}`;

  return (
    <div className="comment-temp" key={id}>
      <div className="comment-header">
        <div className="comment-user-info">
          <img src={pic} alt="pic" />
          <div>
            <p className="comment-name">{name}</p>
          </div>
        </div>

        {activeUser ? (
          auth.currentUser.email == email ? (
            <button onClick={deleteComment}>❌</button>
          ):('')):('')}
      </div>
      <p>{commentContent}</p>
      <p className="comment-time">{timePosted}</p>
    </div>
  );
};
