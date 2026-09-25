const roundMoney = val => Math.round((val + Number.EPSILON) * 100) / 100;

function calculateVatPricing({ enteredAmount, quantity, vatEnabled, vatRate, vatPriceMode }) {
  if (vatPriceMode === 'EXCLUSIVE') {
    const subtotalAmount = roundMoney(enteredAmount * quantity);
    const vatAmount = roundMoney(subtotalAmount * (vatRate / 100));
    const totalAmount = roundMoney(subtotalAmount + vatAmount);
    return { subtotalAmount, vatAmount, totalAmount };
  } else {
    const totalAmount = roundMoney(enteredAmount * quantity);
    const subtotalAmount = roundMoney(totalAmount / (1 + vatRate / 100));
    const vatAmount = roundMoney(totalAmount - subtotalAmount);
    return { subtotalAmount, vatAmount, totalAmount };
  }
}

console.log("CASE A:", calculateVatPricing({ enteredAmount: 678, quantity: 1, vatEnabled: true, vatRate: 15, vatPriceMode: 'INCLUSIVE' }));
console.log("CASE B:", calculateVatPricing({ enteredAmount: 678, quantity: 2, vatEnabled: true, vatRate: 15, vatPriceMode: 'INCLUSIVE' }));

