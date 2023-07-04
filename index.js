const connection = require('./connection')
const express = require('express')
const cors = require('cors')
const jwt = require('jsonwebtoken')
const multer = require('multer');
const CookieParser = require('cookie-parser')
const path = require('path');
const fs = require('fs');

const app = express()

app.use(express.static(path.join(__dirname, './public')));
app.use(express.json({ limit: '50mb' }));
// app.use(express.limit(100000000));
app.use(express.urlencoded({ extended: true, limit: '25mb', parameterLimit: 25 }));
app.use(cors());
app.use(CookieParser())




const bcrypt = require('bcryptjs');

const upload = multer({
    storage: multer.diskStorage({
        destination: function (req, file, callBackFun) {
            callBackFun(null, "./public")
        },
        filename: function (req, file, callBackFun) {
            callBackFun(null, `/uploads/${Date.now()}-${file.originalname}`)
        }
    })
})

// auth api

app.post('/register', (req, res) => {
    // check existing user
    const query = 'SELECT * FROM users where email = ? OR username = ?'
    connection.query(query, [req.body.inputs.email, req.body.inputs.username], (err, data) => {
        // is error return error
        if (err) return res.json(err)

        // if data has length that means that user already exists 
        if (data.length) return res.status(409).json('User already exist !')

        // if not than continue

        // now first hash the password
        const salt = bcrypt.genSaltSync(10);
        const hash = bcrypt.hashSync(req.body.inputs.password, salt);

        // create user

        const query = "INSERT INTO users(`userImage`, `username`, `email`, `password`) VALUES (?)"
        const values = [
            req.body.userImage,
            req.body.inputs.username,
            req.body.inputs.email,
            hash
        ]
        connection.query(query, [values], (err, data) => {
            // is error return error
            if (err) return res.json(err);
            // if no error than 
            return res.status(200).json('user has been created')
        })
    })
})

// login

app.post('/login', (req, res) => {
    // first we check if user exists or not
    const query = "SELECT * FROM users WHERE username = ?";
    connection.query(query, [req.body.username], (err, data) => {
        // if error than return error
        if (err) return res.json('error', err)

        // now if data length is equals to 0 that means username don't exists in database
        if (data.length === 0) return res.status(404).json('User not found !')

        // now if data length is not equal to 0 that means username exists in database so now check for password

        const isPasswordCorrect = bcrypt.compareSync(req.body.password, data[0].password)

        // now if password don't match return error
        if (!isPasswordCorrect) return res.status(404).json('Incorrect username or password !')

        // now if password matches

        // first create token using jwt web token 
        // we have used id here because id is unique for every user
        const token = jwt.sign({ id: data[0].id }, "jwtKey")

        // now we save token in cookies using cookie parser and we use httpOnly for security purpose
        // by using httpOnly user can only access this token by api so it is secure 

        // we dont want to send password to the cookies so we seprate our password from other data

        const { password, ...otherData } = data[0]

        // console.log('token', token)

        res.cookie('access_token', token, {
            httpOnly: true
        }).status(200).json(otherData)
    })
})

// LOGOUT 

// app.post('/logout', (req, res)=> {
//     res.clearCookie("access_token", {
//         sameSite: "none",
//         secure: true
//     }).res.status(200).json('user has been log out')
// })



// add post image 
app.post('/addPostImage', upload.single('file'), (req, res) => {
    const file = req.file;
    res.status(200).json(file?.filename)
})

// add post image 
app.post('/addUserImage', upload.single('file'), (req, res) => {
    const file = req.file;
    res.status(200).json(file.filename)
})


// add post
app.post('/addPost', (req, res) => {
    const token = req.cookies.access_token;
    // if(!token) return res.status(401).json("Not Authanticated!"); 

    // jwt.verify(token, "jwtkey", (err, userInfo)=> {
    // if(err) return res.status(403).json('token is not valid!')

    const query = "INSERT INTO posts (`title`,`shortDesc`, `description`, `image`, `category`, `date`, `userId`, `status`) VALUES (?)";

    const values = [
        req.body.title,
        req.body.shortDesc,
        req.body.description,
        req.body.image,
        req.body.category,
        req.body.date,
        req.body.userId,
        req.body.status
    ]
    connection.query(query, [values], (err, data) => {
        if (err) return res.json('error', err)
        return res.json('post has been created')
    })
    // })
})


// add comments
app.post('/addComment', (req, res) => {
    const query = 'INSERT INTO comments (`commentUser`, `commentUserEmail`, `commentUserMessage`,`commentDate`, `postId`) VALUES (?)'
    const values = [
        req.body.comments.commentUser,
        req.body.comments.commentUserEmail,
        req.body.comments.commentUserMessage,
        req.body.commentDate,
        req.body.postId
    ]
    connection.query(query, [values], (err, data) => {
        if (err) return res.json(err)
        return res.json('comment has been added')
    })
})

// get comments
app.get('/getComment/:id', (req, res) => {
    const query = "SELECT `commentUser`, `commentUserEmail`, `commentUserMessage`, `commentDate` FROM comments c JOIN posts p ON c.postId=p.id  WHERE p.id = ?"
    connection.query(query, [req.params.id], (err, data) => {
        if (err) return res.json(err)
        return res.status(200).json(data)
    })
})

// get post
app.get('/getPosts', (req, res) => {
    // first we check if there is any category in query params if any than select posts from that category otherwise select all posts
    const query = req.query.category ? 'SELECT `username`, u.userImage, `title`, p.image ,`category`, `date`, `shortDesc`, p.id FROM users u JOIN posts p ON u.id=p.userId WHERE category = ?'
        : 'SELECT `username`, u.userImage, `title`, p.image ,`category`, `date`, `shortDesc`, p.id FROM users u JOIN posts p ON u.id=p.userId'
    connection.query(query, [req.query.category], (err, data) => {
        if (err) return res.json(err);
        return res.status(200).json(data)
    })
})


// get 6 posts for home page
app.get('/getHomePosts', (req, res) => {
    // first we check if there is any category in query params if any than select posts from that category otherwise select all posts
    const query = req.query.category ? 'SELECT `username`, u.userImage, `title`, p.image ,`category`, `date`, `shortDesc`, p.id FROM users u JOIN posts p ON u.id=p.userId WHERE category = ?'
        : 'SELECT `username`, u.userImage, `title`, p.image ,`category`, `date`, `shortDesc`, p.id FROM users u JOIN posts p ON u.id=p.userId LIMIT 6'
    connection.query(query, [req.query.category], (err, data) => {
        if (err) return res.json(err);
        return res.status(200).json(data)
    })
})

// get api for 3 random post for hero banner
app.get('/getHeroBanner', (req, res) => {
    // ORDER BY RAND() this return the three random posts from the table and limit 3 only provide the 3 resilts
    const query = 'SELECT `username`, u.userImage, `title`, p.image ,`category`, `date`, `shortDesc`, p.id FROM users u JOIN posts p ON u.id=p.userId ORDER BY RAND() LIMIT 3';
    connection.query(query, (err, data) => {
        if (err) return res.json(err);
        return res.status(200).json(data);
    });
});

// get post for user admin
app.get('/getUserPosts/:id', (req, res) => {
    // first we check if there is any category in query params if any than select posts from that category otherwise select all posts
    const query = 'SELECT * FROM posts WHERE userId = ?'
    connection.query(query, [req.params.id], (err, data) => {
        if (err) return res.json(err);
        return res.status(200).json(data)
    })
})

// GET SINGLE POST
app.get('/getSinglePost/:id', (req, res) => {
    const query = "SELECT `username`, u.userImage, `title`, `description`, p.image ,`category`, `date`, `shortDesc`, p.id FROM users u JOIN posts p ON u.id=p.userId WHERE p.id = ?"
    connection.query(query, [req.params.id], (err, data) => {
        if (err) return res.json(err);
        return res.status(200).json(data)
    })
})

// DELETE SINGLE POST
app.get('/deletePost/:id', (req, res) => {
    const postId = req.params.id;
    const query = "SELECT * FROM posts WHERE id = ?";

    connection.query(query, [postId], (err, result) => {
        if (err) return res.json(err);

        if (result.length === 0) {
            return res.status(404).json({ message: "Post not found" });
        }

        const post = result[0];
        const imagePath = 'public' + post.image; // Assuming the 'image' column contains the image filename/path

        const deleteQuery = "DELETE FROM posts WHERE id = ?";

        connection.query(deleteQuery, [postId], (err, data) => {
            if (err) return res.json(err);

            fs.unlink(imagePath, (err) => {
                if (err) {
                    // console.error(err);
                }
                // console.log(`Deleted image: ${imagePath}`);
            });

            return res.status(200).json({ message: "Post deleted successfully" });
        });
    });
});

// edit post
app.put('/updatePost/:id', (req, res) => {
    const postId = req.params.id;
    const query = 'UPDATE posts SET `title`=?, `description`=?, `image`=?, `category`=?, `shortDesc`=?, `status`=? WHERE id = ?'
    const values = [
        req.body.title,
        req.body.description,
        req.body.image,
        req.body.category,
        req.body.shortDesc,
        req.body.status
    ]
    connection.query(query, [...values, postId], (err, data) => {
        if (err) return res.json(err);
        return res.json("post has been updated")
    })
})

app.listen('9000', () => {
    console.log('baaki sab theek , code chl rha h')
})


