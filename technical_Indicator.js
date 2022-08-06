// const technicalindicators = require("technicalindicators");
// technicalindicators.setConfig("precision", 10);
// const EMA = technicalindicators.EMA;
const EMA = require("technicalindicators").EMA;
const RSI = require("technicalindicators").RSI;

////////////////////////////////////////////////////////////////////////////////////////////////
// EMA formula
exports.calculateEMA = (period, value, reversedInput = true) => {
  return EMA.calculate({
    period: period,
    values: value,
    reversedInput,
  });
};

////////////////////////////////////////////////////////////////////////////////////////////////
// RSI formula
exports.calculateRSI = (period, values, reversedInput = true) => {
  return RSI.calculate({
    period,
    values,
    reversedInput,
  });
};
