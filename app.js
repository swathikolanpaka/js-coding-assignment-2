const express = require("express");
const path = require("path");
const app = express();
app.use(express.json());
const { open } = require("sqlite");
const sqlite = require("sqlite3");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
let db = null;

const dbPath = path.join(__dirname, "twitterClone.db");

// Initialize Db and Server
const initializeDbAndServer = async () => {
  try {
    db = await open({
      driver: sqlite.Database,
      filename: dbPath,
    });
    app.listen(3000, () => {
      console.log("Server is running");
    });
  } catch (e) {
    console.log(`Db error:${e.message}`);
    process.exit(1);
  }
};
initializeDbAndServer();

//API 1 Register

app.post("/register/", async (request, response) => {
  const userDetails = request.body;
  const { username, password, name, gender } = userDetails;
  let hashedPassword = await bcrypt.hash(password, 10);
  const userQuery = `SELECT* FROM user WHERE username="${username}";`;
  const dbUser = await db.get(userQuery);

  if (dbUser === undefined) {
    const createUser = `INSERT INTO user (username,password,name,gender) 
        VALUES 
        ("${username}",
        "${hashedPassword}",
        "${name}",
        "${gender}"
            );`;
    if (password.length < 6) {
      response.status(400);
      response.send("Password is too short");
    } else {
      await db.run(createUser);
      response.status(200);
      response.send("User created successfully");
    }
  } else {
    response.status(400);
    response.send("User already exists");
  }
});

//API 2 Login
app.post("/login/", async (request, response) => {
  const userDetails = request.body;
  const { username, password } = userDetails;

  const loginQuery = `SELECT * FROM user WHERE username="${username}";`;
  const dbUser = await db.get(loginQuery);
  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);

    if (isPasswordMatched) {
      const payload = { username: username };
      const jwtToken = jwt.sign(payload, "my_code");
      response.send({ jwtToken });
      console.log({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

//authorizationToken function

const authorizationToken = (request, response, next) => {
  let jwtToken;
  const authorHeader = request.headers["authorization"];
  console.log("author block");
  //console.log(authorHeader);
  if (authorHeader !== undefined) {
    jwtToken = authorHeader.split(" ")[1];
    console.log(jwtToken);
  }
  if (authorHeader === undefined) {
    console.log("no token");
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    console.log("verifying");

    jwt.verify(jwtToken, "my_code", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        request.username = payload.username;
        console.log(request.username);
        next();
      }
    });
  }
};

//API 3
app.get("/user/tweets/feed/", authorizationToken, async (request, response) => {
  console.log("working");
  let userName = request.username;
  let userQuery = `SELECT * FROM user WHERE username="${userName}";`;
  let userDetails = await db.get(userQuery);

  let userId = userDetails.user_id;
  let tweetQuery = `SELECT user.username,tweet.tweet,tweet.date_time AS dateTime FROM follower INNER JOIN tweet ON follower.following_user_id = tweet.user_id WHERE follower.follower_user_id = ${userId}
   ORDER BY
  tweet.date_time DESC
  LIMIT 4;`;
  let tweetResult = await db.get(tweetQuery);
  resp0nse.send(tweetResult);
});

//API 4
app.get("/user/following/", authorizationToken, async (request, response) => {
  console.log("working");
  let query = `SELECT user.name  FROM user INNER JOIN follower ON user.user_id=follower.following_user_id;`;
  let array = await db.all(query);
  response.send(array);
});

//API 5
app.get("/user/followers/", authorizationToken, async (request, response) => {
  console.log("working");
  let query = `SELECT user.name FROM user INNER JOIN follower ON user.user_id=follower.follower_user_id;`;
  let array = await db.all(query);
  response.send(array);
});

//API 6
app.get("/tweets/:tweetId/", authorizationToken, async (request, response) => {
  let { tweetId } = request.params;
  let tweetQuery = `SELECT * FROM tweet WHERE tweet_id=${tweetId};`;
  let tweetResult = await db.get(tweetQuery);
  let userFollowerQuery = `SELECT * FROM follower INNER JOIN user ON follower.following_user_id=user.user_id WHERE follower.follower_user_id===tweetResult.user_id;`;
  let userFollowerDetails = await db.all(userFollowerQuery);

  if (
    userFollowerDetails.some(
      (item) => item.following_user_id === tweetResult.user_id
    )
  ) {
    console.log("result");
  } else {
    response.status(401);
    response.send("Invalid Request");
  }
});

//API 7
app.get(
  "/tweets/:tweetId/likes/",
  authorizationToken,
  async (request, response) => {
    let { tweetId } = request.params;
  }
);

//API 8
app.get(
  "/tweets/:tweetId/replies/",
  authorizationToken,
  async (request, response) => {
    let { tweetId } = request.params;
  }
);

//API 9
app.get("/user/tweets/", authorizationToken, async (request, response) => {
  console.log("working");
  let { tweetId } = request.params;
  let query = `SELECT tweet.tweet FROM user INNER JOIN tweet ON user.user_id=following.user_id WHERE tweet_id=${tweetId};`;
  let array = await db.all(query);
  response.send(array);
});

//API 10
app.post("/user/tweets/", authorizationToken, async (request, response) => {
  let { tweetId, tweet, userId, dateTime } = request.body;
  let query = `INSET INTO tweet (tweetId,tweet,user_id,date_time) 
    VALUES
    (
        ${tweetId},
        "${tweet}",
        ${userId},
        "${dateTime}"
    );`;
  let array = await db.run(query);
  response.send("Created a Tweet");
});

//API 11
app.delete(
  "/tweets/:tweetId/",
  authorizationToken,
  async (request, response) => {
    let { tweetId } = request.params;
    let tweetQuery = `SELECT * FROM tweet WHERE tweet_id=${tweetId};`;
    let tweetResult = await db.get(tweetQuery);
    let userFollowerQuery = `SELECT * FROM follower INNER JOIN user ON follower.following_user_id=user.user_id WHERE follower.follower_user_id===tweetResult.user_id;`;
    let userFollowerDetails = await db.all(userFollowerQuery);

    if (
      userFollowerDetails.some(
        (item) => item.following_user_id === tweetResult.user_id
      )
    ) {
      console.log("result");
      let query = `DELETE FROM tweet WHERE tweet_id=${tweetId};`;
      let dbArray = await db.run(query);
      response.send("Tweet Removed");
    } else {
      response.status(401);
      response.send("Invalid Request");
    }
  }
);

module.exports = app;
