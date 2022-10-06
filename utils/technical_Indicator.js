const { checkPrice } = require("../API/marketAPI");

const EMA = require("technicalindicators").EMA;
const RSI = require("technicalindicators").RSI;

////////////////////////////////////////////////////////////////////////////////////////////////
// EMA formula
exports.calculateEMA = async (
  tradePair,
  checkPricePeriod,
  checkPriceRange,
  EMAperiod,
  EMAvalueRange = 1,
  reversedInput = true
) => {
  const priceArr = await checkPrice(
    tradePair,
    checkPricePeriod,
    checkPriceRange
  );

  if (EMAvalueRange === 1) {
    return EMA.calculate({
      period: EMAperiod,
      values: priceArr,
      reversedInput,
    }).at(0);
  } else {
    return EMA.calculate({
      period: EMAperiod,
      values: priceArr,
      reversedInput,
    }).slice(0, EMAvalueRange);
  }
};

////////////////////////////////////////////////////////////////////////////////////////////////
// RSI formula
exports.calculateRSI = async (
  tradePair,
  checkPricePeriod,
  checkPriceRange,
  RSIperiod,
  RSIvalueRange = 1,
  reversedInput = true
) => {
  const priceArr = await checkPrice(
    tradePair,
    checkPricePeriod,
    checkPriceRange
  );

  if (RSIvalueRange === 1) {
    return RSI.calculate({
      period: RSIperiod,
      values: priceArr,
      reversedInput,
    }).at(0);
  } else {
    return RSI.calculate({
      period: RSIperiod,
      values: priceArr,
      reversedInput,
    }).slice(0, range);
  }
};
