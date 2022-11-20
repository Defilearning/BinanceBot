# Crypto trading bot
This is an automated crypto trading bot written in NodeJS. It is designed to make automated trading with the Binance platform, users can monitor the process through an Internet browser. The bot itself includes 3 major parts: algorithom scripts, frontend UI and backend server developement.

##  Algorithom used
The algorithom uses **EMA** and **RSI** as its technical indicator and uses Binance API to make long or short orders. The logic of the algorithm is described below:-

1. Calculate the EMA with a 4 hour window with 50 previous candles - EMA4h and RSI with 14 previous candles. If the current closing price is above EMA4h and RSI is below 30, it is considered as bull market and the bot will only waiting next signal for the long order. 

- ![1st picture](https://user-images.githubusercontent.com/105770404/199967959-5732cb68-f1d4-4af5-bc28-e972f8e53e1e.png)

- *Note that if the current closing price is > or < 0.25% of the EMA4h, it is considered as uncertain movement. The bot will back to watch mode. It is configurable and kindly check for __How to use__ section*

2. Calculate the current EMA for 9 previous candles - EMA9. The bot will check for 7 future candles, if the current price has crossover the EMA9 and the crossover price is within 0.05% of EMA9, stop loss % is calculated based on the previous lowest price and long order is made. Once the price has hit the target reward ratio or stop loss price, the bot will close its position.

- ![2nd picture](https://user-images.githubusercontent.com/105770404/199973555-f777b1ac-9f80-4e25-a003-d0bcbbcf2f5e.png)

- *Note that the bot wont open order for stop loss percentage which is below 0.11% or 0.4% due to % below 0.11% will incur high commission cost and % above 0.4% will likely to hit stop loss than target profit.*

- *Besides, the for % between 0.35% to 0.4%, the target reward ratio will change to 1.5 to secure profit.*

- *All the default setting mentioned above is configurable and kindly check to __How to use__ section.*

**Other matters to note:**
- This bot is only made for Binance perpetual future trading platform.
- Kindly check for [Bot strategy](https://www.tradingview.com/script/JjAzmxSY-Elbert-RSI/) for backtesting and strategy performance in TradingView.
- For short position, the algorithoms works as same above but reverse.

## Backend Server
Backend server is mainly used for API call to perform certain actions such as start and stop the bot and serve static path for react UI for user experience other than developer.

**Technology used**
| TechStack | Description |
| --- | --- |
| `express` | Create server, routing and serve static build file. |
| `jsonwebtoken` | Used json web token for log in credentials |
| `forever` | Ensuring that bot runs continuously and auto restart. |
| `speakeasy` | Create 2 factor authenticator for extra security. |
| `xss-clean` | Prevent cross site scripting attack. |
| `express-rate-limit` | Prevent API polution. |


**Routes available**
| Routes | Required params | Usage |
| --- | --- | --- |
| `/botFetch` | none | Returns all trading results in 1 week (JSON format). |
| `/bot/login` | `username`, `password` | Login to the server and return JWT cookie. |
| `/bot/logout` | none | Logout to the server and return JWT cookie with 'LoggedOut' value. |
| `/bot/list` | none | Check if there is any process currently ongoing. |
| `/bot/start` | `hour`, `minute`, `type`, `authenticator` (all params are optional except `authenticator`) | Start the bot with given `time` and `type`: if no `hour` and `minute` is given, the bot will start immediately, otherwise delay the specific time given. `Type` enum: `long`and `short`. If `type` is given `long`, the bot will made orders for long. If no params is given, bot will make long or short orders. |
| `/bot/clearStartTime` | `authenticator` | Clear start delay of the bot. |
| `/bot/stop` | `authenticator` | Stop the bot. If there is any position, the bot cannot stop immediately as the position has to be cleared. |
| `/bot/logs` | none | Check output logs from bot. |
| `/bot/error` | none | Check error logs from bot. |
| `/bot/checkPosition` | none | Check if there is any position currently. |

## Frontend UI
Kindly check for [React-App](https://github.com/Defilearning/BinanceBot/tree/main/React-App).

## How to use
Kindly setup `.env` for the following params:-

| Params | Description |
| --- | --- |
| `API_KEY` | Binance API key. |
| `API_SECRET` | Binance API secret. |
| `TESTNET` | If using for testnet, use `https://testnet.binancefuture.com`. Otherwise for actual net, use `https://fapi.binance.com` |
| `PORT` | Set up port. |
| `ADMIN_USERNAME1` | Admin username. |
| `ADMIN_USERNAME2` | 2nd admin username. |
| `ADMIN_PASSWORD` | Password for verification. |
| `JWT_SECRET` | JSON web token secret. |
| `JWT_EXPIRES_IN` | JSON web token expires time. |
| `JWT_COOKIE_EXPIRES_IN` | JSON web token cookie expires in (hour). |

Clone the repository, run `npm start` and setting up 2 factor authentication from `2FA.txt` from your local machine. 

### Other configuration
Kindly amend `GlobalData.js` in `utils` folder for specific configuration purpose. 

| Variable | Description |
| --- | --- |
| `accountFiat` | Fiat used for trading. Recommended for using `BUSD` or `USDT`. |
| `accountMargin` | Account margin type.  |
| `accountLeverage` | Account leverage for the trade. Different product has different leverage. Kindly check with Binance website. |
| `tradePair` | Trade pair used for trading. |
| `defaultCommission` | Default commission use for calculate culmulative Profit and Loss for the day. |
| `lowestStopLossPer` | Lowest stop loss % bot can accept. |
| `ChangeRewardRatioPer` | If the stop loss % has reach this value, the target reward ratio will become 1.5. |
| `highestStopLossPer` | Lowest stop loss % bot can accept. |
| `riskStopLossPrice` | How many profit/loss USD per trade. eg: if value = 3, each stop loss will cut at USD3, each profit will gain USD6 if target profit ratio is 2. |
| `decimalToFixed` | How many decimals for the crypto quantity. |
| `global4hNonTradeRestriction` | % based on EMA4h that bot will restrict for trading. |
| `OrderIntervalMin` | Time Interval in minutes in watch mode. |
| `orderTimeFrame` | Timeframe which used to check crypto prices from Binance platform. |
| `nearEMAPer` | % tolerance for bot to make order. |
| `nearEMAStopCounter` | How many counters to watch for `nearEMAPer`. |
| `defaultStopLossPer` | Default stop loss % if the bot crashes which there is position. |
| `defaultTargetProfitPer` | Default target profit % if the bot crashes which there is position. |
| `targetRewardRatio` | How many reward ratio for each trade. |
| `positionIntervalSec` | Check price in every second if there is position and close the position. |
| `loopStopCandleCounter` | How many counter to watch if long and short criteria met. |
| `targetProfitPrice`, `stopLossPrice`, `loopFinalPrice`, `loopInterval` | Please dont change these value as it will affect bot performance. |

## Disclamer
This software is for learning purposes only. Do not risk money which you are afraid to lose. USE THE SOFTWARE AT YOUR OWN RISK. THE AUTHORS ASSUME NO RESPONSIBILITY FOR YOUR TRADING RESULTS.

Please start by running the bot in testnet and do not engage money before you understand how it works and what profit/loss you should expect.

NodeJS knowledge is strongly recommended before start using this bot. Do not hesitate to read the source code and understand the mechanism of this bot.

