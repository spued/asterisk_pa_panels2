var array = [];

const functionToExecute = (delay) => console.log(`Ended after ${delay}`);

const executeLater = (functionToExecute, delay) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(functionToExecute(delay));
    }, delay);
  });
};

for (let index = 1234; index <= 1345; index++) {
  array.push({
    number: index,
    status: 0,
  });
}

//console.log(array);

// try to allocate number
for (let task = 0; task <= 12; task++) {
  const randomTimeInMs = Math.random() * 3000;
  const indx = array.findIndex((num) => num.status == 0);
  (async function () {
    array[indx].status = 1;
    await executeLater(functionToExecute, randomTimeInMs);
    console.log(
      "Continue through this code after waiting...",
      array[indx].number
    );
    array[indx].status = 0;
  })();
}

// If you are in the entry file use following syntax. If you are already in an async function, just call `await executeLater()`
