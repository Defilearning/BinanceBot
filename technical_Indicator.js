// const technicalindicators = require("technicalindicators");
// technicalindicators.setConfig("precision", 10);
// const EMA = technicalindicators.EMA;
const EMA = require("technicalindicators").EMA;

////////////////////////////////////////////////////////////////////////////////////////////////
// EMA formula
exports.calculateEMA = (period, value, reversedInput = true) => {
  return EMA.calculate({
    period: period,
    values: value,
    reversedInput,
  });
};
