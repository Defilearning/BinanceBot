require("dotenv").config();

const path = require("path");
const express = require("express");
const app = express();
const port = process.env.PORT;

const { promisify } = require("util");
const { checkPrice, checkTrades } = require("./ServerUtils");
const { accountPosition } = require("./utils/functionModule");
const { tradePair } = require("./utils/GlobalData").accountData;
let { positionData } = require("./utils/GlobalData");

////////////////////////////////////////////////////////////////////////////////////
const helmet = require("helmet");
const xss = require("xss-clean");
const cookieParser = require("cookie-parser");
const compression = require("compression");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const forever = require("forever");

////////////////////////////////////////////////////////////////////////////////////
// set start file for start API
let startFile;
const currentStatus = {
  "./BinanceBotLong.js": "LONG only",
  "./BinanceBotShort.js": "SHORT only",
  "./BinanceBotNormal.js": "both LONG and SHORT",
};

////////////////////////////////////////////////////////////////////////////////////
// CORS
app.use(cors());
app.options("*", cors());

////////////////////////////////////////////////////////////////////////////////////
// Setting up 2FA
const speakeasy = require("speakeasy");
const qrcode = require("qrcode");

const { ascii, hex, base32, otpauth_url } = speakeasy.generateSecret({
  name: "Binance-Bot",
});

qrcode.toDataURL(otpauth_url, function (err, data) {
  if (err) {
    console.log(err);
  }
  fs.writeFileSync(
    "2FA.txt",
    `Ascii: ${ascii}\nHex: ${hex}\nBase32: ${base32}\nQRpath: ${data.toString()}`
  );
});

////////////////////////////////////////////////////////////////////////////////////
// Rate limit
const rateLimit = require("express-rate-limit");

const apiLimiter = (timeMin, request) =>
  rateLimit({
    windowMs: timeMin * 60 * 1000, // 15 minutes
    max: request, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  });

////////////////////////////////////////////////////////////////////////////////////
// JWT
const createSendToken = (user, statusCode, req, res) => {
  const token = jwt.sign({ user }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 1000 * 60 * 60
    ),
    httpOnly: true,
    secure: req.secure || req.headers["x-forwarded-proto"] === "https",
  };

  res.cookie("EBjwt", token, cookieOptions);

  res.status(statusCode).json({
    status: "success",
    token,
    data: {
      user,
    },
  });
};

// Helmet
app.use(helmet.originAgentCluster());

// Body parser, reading data from body into req.body
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use(cookieParser());

// Data sanitization against XSS
app.use(xss());

// Request compression
app.use(compression());

app.use(express.static(path.join(__dirname, "React-App", "build")));
app.use(express.static("public"));

////////////////////////////////////////////////////////////////////////////////////
// NOTE: Fetch Binance Data
let responseData = {};
app.get("/botData", apiLimiter(15, 7000), (req, res) => {
  res.status(200).json({
    status: "success",
    data: responseData,
  });
});

app.get("/botFetch", apiLimiter(15, 50), async (req, res) => {
  try {
    const response = (await checkTrades(1000)).reverse();

    if (!response) {
      return res.status(400).json({
        status: "error",
        data: "No response from Binance, please try again!",
      });
    }

    const data = await Promise.all(
      response.map(async (el) => {
        const bnbPrice = +(await checkPrice(
          "BNBBUSD",
          "1m",
          1,
          el.time,
          el.time + 1000 * 60,
          res
        ));

        const date = new Date(el.time);

        const localeDate = new Intl.DateTimeFormat("en-MY", {
          dateStyle: "full",
          timeStyle: "full",
          hour12: false,
          timeZone: "Asia/Singapore",
        })
          .format(date)
          .split(" ");

        // console.log(localeDate);
        return {
          year: localeDate[3].slice(0, 4),
          month: localeDate[2],
          day: localeDate[1],
          time: localeDate[5],
          symbol: el.symbol,
          side: el.side,
          price: el.price,
          commissionAsset: el.commissionAsset,
          commissionUSD:
            el.commissionAsset === "BUSD"
              ? -el.commission
              : -el.commission * bnbPrice,
          realisedPnL: el.realizedPnl,
          cryptoQuantity: el.qty,
          fiatQuantity: el.quoteQty,
        };
      })
    );

    responseData = data;

    res.status(201).json({
      status: "success",
      data,
    });
  } catch (err) {
    console.log(err);
    res.status(400).json({
      status: "error",
      data: err,
    });
  }
});

////////////////////////////////////////////////////////////////////////////////////
// NOTE: Authentication
let tokenIdEB = null;
let tokenIdJJ = null;
app.post("/bot/login", apiLimiter(5, 5), (req, res, next) => {
  const { username, password } = req.body;

  // 1) check if username and password exist
  if (!username || !password) {
    return res.status(400).json({
      status: "error",
      data: `Please provide username and password!`,
    });
  }

  // 2) Check if username or password is correct
  req.body.username = undefined;
  req.body.password = undefined;

  if (
    username === process.env.ADMIN_USERNAME1 &&
    password === process.env.ADMIN_PASSWORD
  ) {
    tokenIdEB = (Math.random() * 8888).toFixed().toString();
    // 3) If everything ok, send token to client
    createSendToken(tokenIdEB, 200, req, res);
  } else if (
    username === process.env.ADMIN_USERNAME2 &&
    password === process.env.ADMIN_PASSWORD
  ) {
    tokenIdJJ = (Math.random() * 8888).toFixed().toString();
    // 3) If everything ok, send token to client
    createSendToken(tokenIdJJ, 200, req, res);
  } else {
    return res.status(400).json({
      status: "error",
      data: `Incorrect username or password!`,
    });
  }
});

app.get("/bot/logout", apiLimiter(1, 50), (req, res, next) => {
  res.cookie("EBjwt", "Loggedout", {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  res.status(200).json({ status: "success" });
});

const accountProtect = async (req, res, next) => {
  // 1) Getting token and check of if it's there
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies.EBjwt) {
    token = req.cookies.EBjwt;
  }

  if (!token) {
    return res.status(400).json({
      status: "error",
      data: `Please login to gain access!`,
    });
  }

  try {
    // 2) Verification token
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

    // 3) Check if user still exists
    if (tokenIdEB === decoded.user || tokenIdJJ == decoded.user) {
    } else {
      return res.status(400).json({
        status: "error",
        data: `Token ID does not exist, please log in again!`,
      });
    }

    next();
  } catch (err) {
    if (err.message === "jwt expired") {
      return res.status(400).json({
        status: "error",
        data: `Token has expired, please login again`,
      });
    }
  }
};

const twoFactorProtect = (req, res, next) => {
  const { authenticator } = req.body;

  if (!authenticator) {
    return res.status(400).json({
      status: "error",
      data: `Please provide 2 factor authenticator code`,
    });
  }

  const verified = speakeasy.totp.verify({
    secret: ascii,
    encoding: "ascii",
    token: authenticator,
  });

  if (!verified) {
    return res.status(400).json({
      status: "error",
      data: `2 factor authenticator code is wrong, please try again`,
    });
  }

  next();
};

app.get("/isLoggedIn", apiLimiter(1, 50), async (req, res, next) => {
  // 1) Getting token and check of if it's there
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies.EBjwt) {
    token = req.cookies.EBjwt;
  }

  if (!token) {
    return res.status(400).json({
      status: "error",
      data: `Please login to gain access!`,
    });
  }

  try {
    // 2) Verification token
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

    // 3) Check if user still exists
    if (tokenIdEB === decoded.user || tokenIdJJ == decoded.user) {
      return res.status(201).json({
        status: "success",
        data: `Account is logged in!`,
      });
    } else {
      return res.status(400).json({
        status: "error",
        data: `Token ID does not exist, please log in again!`,
      });
    }
  } catch (err) {
    if (err.message === "jwt expired") {
      return res.status(400).json({
        status: "error",
        data: `Token has expired, please login again`,
      });
    }

    return res.status(400).json({
      status: "error",
      data: err,
    });
  }
});

////////////////////////////////////////////////////////////////////////////////////
// NOTE: CLI Command
let startTimeDelay = null;
// let endTimeDelay = null;

const isProcessing = (req, res, next) => {
  forever.list(true, (error, processes) => {
    if (processes) {
      const check = processes.split("\n").find(function (line) {
        return line.toString().includes("EbJj");
        // line.toString().includes("EbJj");
      });
      console.log(check);

      if (check) {
        if (req.url === "/bot/stop") {
          return next();
        } else {
          return res.status(200).json({
            status: "success",
            data: `There is a process in the background - ${currentStatus[startFile]}`,
          });
        }
      } else {
        if (req.url === "/bot/start") {
          return next();
        } else {
          return res.status(400).json({
            status: "error",
            data: `There is no process in the background`,
          });
        }
      }
    } else {
      return res.status(400).json({
        status: "error",
        data: `There is no process in the background`,
      });
    }
  });
};

app.get("/bot/list", apiLimiter(1, 50), accountProtect, isProcessing);

app.post(
  "/bot/start",
  apiLimiter(1, 50),
  accountProtect,
  twoFactorProtect,
  isProcessing,
  (req, res) => {
    // Check if there is any delay process in the background, avoid start if there is any delay process
    if (
      !(
        startTimeDelay?._idleTimeout === -1 ||
        startTimeDelay === null ||
        startTimeDelay?._idleTimeout === 1 ||
        !startTimeDelay?._onTimeout
      )
    ) {
      return res.status(400).json({
        status: "error",
        data: `There is a process delay in background`,
      });
    }

    // Get delay hour and minute
    const { hour, minute, type } = req.body;

    // Calculate delay date
    let delay = 0;
    if (hour) {
      delay = delay + hour * 1000 * 60 * 60;
    } else {
      delay = delay;
    }
    if (minute) {
      delay = delay + minute * 1000 * 60;
    } else {
      delay = delay;
    }
    const currentDate = Date.now();

    // Check type
    if (type === "long") {
      startFile = "./BinanceBotLong.js";
    } else if (type === "short") {
      startFile = "./BinanceBotShort.js";
    } else {
      startFile = "./BinanceBotNormal.js";
    }

    startTimeDelay = setTimeout(() => {
      forever.startDaemon(startFile, {
        uid: "EbJj",
        silent: true,
        minUptime: 2000,
        spinSleepTime: 1000,
        outFile: "./logs/output.log",
        errFile: "./logs/err.log",
      });

      forever.log.info(
        `${new Date()} forever process has started with ${startFile}`
      );

      clearTimeout(startTimeDelay);
    }, delay);

    return res.status(200).json({
      status: "success",
      data: `Bot will start in ${new Date(currentDate + delay).toString()} ${
        type ? type + "only" : ""
      }`,
    });
  }
);

// NOTE: Don't use this time on API as no check if there is any position
app.post(
  "/bot/stop",
  apiLimiter(1, 50),
  accountProtect,
  twoFactorProtect,
  isProcessing,
  async (req, res) => {
    try {
      // Check current position, if there is position, return res with cannot stop process
      positionData = await accountPosition(tradePair, positionData);
      let { positionAmt } = positionData;

      if (positionAmt !== 0) {
        return res.status(400).json({
          status: "error",
          data: `There is a position currently, process cannot be stopped!`,
        });
      }

      /*
      const { hour, minute } = req.body;
      
      let delay = 0;
      
    if (hour) {
      delay = delay + hour * 1000 * 60 * 60;
    } else {
      delay = delay;
    }
    
    if (minute) {
      delay = delay + minute * 1000 * 60;
    } else {
      delay = delay;
    }
    
    const currentDate = Date.now();
    */
      //   endTimeDelay = setTimeout(async () => {
      const runner = forever.stop("EbJj", true);
      runner.on("stop", function (processes) {
        if (processes) {
          forever.log.info(`${new Date()} Forever stopped processes:`);
          processes.split("\n").forEach(function (line) {
            forever.log.data(line);
          });
          res.status(200).json({
            status: "success",
            data: "Bot has stopped",
          });
        }
      });
    } catch (err) {
      return res.status(400).json({
        status: "error",
        data: err.toString(),
      });
    }
  }
);

app.get("/bot/logs", apiLimiter(1, 60), accountProtect, (req, res) => {
  const data = fs.readFileSync("./logs/output.log").toString("ascii");

  res.status(200).json({
    status: "success",
    data,
  });
});

app.get("/bot/error", apiLimiter(1, 60), accountProtect, (req, res) => {
  const data = fs.readFileSync("./BinanceError.txt").toString("ascii");

  res.status(200).json({
    status: "success",
    data,
  });
});

app.post(
  "/bot/clearStartTime",
  apiLimiter(1, 60),
  accountProtect,
  twoFactorProtect,
  (req, res) => {
    if (
      startTimeDelay?._idleTimeout === -1 ||
      startTimeDelay === null ||
      startTimeDelay?._idleTimeout === 1 ||
      !startTimeDelay?._onTimeout
    ) {
      return res.status(200).json({
        status: "success",
        data: "There is no time delay!",
      });
    }

    clearTimeout(startTimeDelay);

    res.status(200).json({
      status: "success",
      data: "Time delay has cleared!",
    });
  }
);

/*
app.post(
  "/bot/clearEndTime",
  apiLimiter(1, 60),
  accountProtect,
  twoFactorProtect,
  (req, res) => {
    if (endTimeDelay?._idleTimeout === -1 || endTimeDelay === null) {
      return res.status(200).json({
        status: "success",
        data: "There is no time delay!",
      });
    }

    clearTimeout(endTimeDelay);

    res.status(200).json({
      status: "success",
      data: "Time delay has cleared!",
    });
  }
);
*/

app.get(
  "/bot/checkPosition",
  apiLimiter(1, 60),
  accountProtect,
  async (req, res) => {
    try {
      positionData = await accountPosition(tradePair, positionData);
      let { positionAmt, unRealizedProfit, positionPrice } = positionData;

      if (positionAmt === 0) {
        return res.status(200).json({
          status: "success",
          data: "There is no position currently!",
        });
      } else {
        return res.status(200).json({
          status: "success",
          data: `${
            positionAmt < 0 ? "SHORT" : "LONG"
          } ${tradePair} - Entry Price: ${positionPrice}, Unrealised Profit: ${unRealizedProfit}`,
        });
      }
    } catch (err) {
      return res.status(400).json({
        status: "error",
        data: err.toString(),
      });
    }
  }
);

////////////////////////////////////////////////////////////////////////////////////
app.listen(port, () => {
  console.log(`App is running on port ${port}`);
});

process.on("uncaughtException", (err) => {
  fs.appendFileSync(
    "BinanceError.txt",
    `\n${new Date()}: Error - ${err.toString()}\n-----------------------------------------------------------------------------------`
  );
  console.log(`----------------------------------------`);
  console.log(
    `System down on Uncaught Exception on Server, server restarting:-`
  );
  console.log(`----------------------------------------`);
  process.exit(1);
});

process.on("uncaughtRejection", (err) => {
  fs.appendFileSync(
    "BinanceError.txt",
    `\n${new Date()}: Error - ${err.toString()}\n-----------------------------------------------------------------------------------`
  );
  console.log(`----------------------------------------`);
  console.log(
    `System down on Uncaught Rejection on Server, server restarting:-`
  );
  console.log(`----------------------------------------`);
  process.exit(1);
});
