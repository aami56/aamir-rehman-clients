import { useState, useEffect } from "react";
import { getSavedCurrency } from "@/lib/utils";

export function useCurrency() {
  const [currency, setCurrency] = useState(getSavedCurrency);

  useEffect(() => {
    const handleCurrencyChange = () => {
      setCurrency(getSavedCurrency());
    };

    window.addEventListener("currencyChange", handleCurrencyChange);
    window.addEventListener("storage", handleCurrencyChange);

    return () => {
      window.removeEventListener("currencyChange", handleCurrencyChange);
      window.removeEventListener("storage", handleCurrencyChange);
    };
  }, []);

  return currency;
}
