// server.js
const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Read initial data from db.json
let rawData = fs.readFileSync(path.join(__dirname, 'db.json'), 'utf8');
let stockData = JSON.parse(rawData);  // { memes: [ ... ] }

// Initialize trend properties if they don't exist
stockData.memes.forEach(meme => {
  if (!meme.trend) {
    meme.trend = "random";  // possible values: "up", "down", "random"
    meme.streak = 0;        // counts consecutive strong moves when random
    meme.trendCount = 0;    // how many updates remain for a locked-in trend
  }
});

// Utility function to get a random number between min and max (inclusive)
function randomInRange(min, max) {
  return Math.random() * (max - min) + min;
}

// Function to update stock prices based on trend
function updatePrices() {
  stockData.memes.forEach(meme => {
    const oldPrice = meme.price;
    let changePercent;

    // Check current trend
    if (meme.trend === "up") {
      // If trending up, bias change to positive values
      changePercent = randomInRange(0.1, 2);  // positive bias
      meme.trendCount -= 1;
      if (meme.trendCount <= 0) {
        meme.trend = "random"; // revert to random when trend period ends
        meme.streak = 0;
      }
    } else if (meme.trend === "down") {
      // If trending down, bias change to negative values
      changePercent = randomInRange(-2, -0.1);  // negative bias
      meme.trendCount -= 1;
      if (meme.trendCount <= 0) {
        meme.trend = "random"; // revert to random when trend period ends
        meme.streak = 0;
      }
    } else {
      // Random trend: change can be anywhere between -2% and +2%
      changePercent = randomInRange(-2, 2);
      
      // Check for strong moves to possibly lock a trend
      if (changePercent > 1) {
        // Increase positive streak (or reset if negative streak existed)
        meme.streak = (meme.streak >= 0) ? meme.streak + 1 : 1;
      } else if (changePercent < -1) {
        // Increase negative streak
        meme.streak = (meme.streak <= 0) ? meme.streak - 1 : -1;
      } else {
        // Reset streak if change is mild
        meme.streak = 0;
      }
      
      // Lock in a trend if streak is high enough
      if (meme.streak >= 3) {
        meme.trend = "up";
        meme.trendCount = Math.floor(randomInRange(3, 6));  // trend lasts 3-5 updates
        meme.streak = 0;
      } else if (meme.streak <= -3) {
        meme.trend = "down";
        meme.trendCount = Math.floor(randomInRange(3, 6));
        meme.streak = 0;
      }
    }

    // Calculate new price and update
    const newPrice = oldPrice * (1 + changePercent / 100);
    meme.price = parseFloat(newPrice.toFixed(2));
    meme.change = parseFloat(changePercent.toFixed(2));
  });

  // Write the updated data to db.json so it's persisted
  fs.writeFileSync(path.join(__dirname, 'db.json'), JSON.stringify(stockData, null, 2));
}

// Update prices every 1 seconds
setInterval(updatePrices, 1000);

// Endpoint to fetch current stocks
app.get('/api/stocks', (req, res) => {
  res.json(stockData.memes);
});

// Serve all files (including index.html) from current directory
app.use(express.static(path.join(__dirname)));

// Start the server
app.listen(PORT, () => {
  console.log(`Server running at http://0.0.0.0:${PORT}`);
});

