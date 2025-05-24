/**
 * Black-Scholes Option Pricing Model Implementation
 * Includes calculation of option price and Greeks (Delta, Gamma, Vega, Theta, Rho)
 */

class BlackScholes {
    /**
     * Standard normal cumulative distribution function
     * @param {number} x - Input value
     * @returns {number} Probability
     */
    static normalCDF(x) {
        const a1 = 0.254829592;
        const a2 = -0.284496736;
        const a3 = 1.421413741;
        const a4 = -1.453152027;
        const a5 = 1.061405429;
        const p = 0.3275911;

        const sign = x < 0 ? -1 : 1;
        x = Math.abs(x) / Math.sqrt(2.0);

        const t = 1.0 / (1.0 + p * x);
        const erf = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

        return 0.5 * (1.0 + sign * erf);
    }

    /**
     * Standard normal probability density function
     * @param {number} x - Input value
     * @returns {number} Density
     */
    static normalPDF(x) {
        return Math.exp(-0.5 * x * x) / Math.sqrt(2.0 * Math.PI);
    }

    /**
     * Calculate d1 parameter for Black-Scholes formula
     * @param {number} S - Spot price
     * @param {number} K - Strike price
     * @param {number} r - Risk-free rate (as decimal)
     * @param {number} v - Volatility (as decimal)
     * @param {number} T - Time to expiry (in years)
     * @returns {number} d1 parameter
     */
    static d1(S, K, r, v, T) {
        return (Math.log(S / K) + (r + 0.5 * v * v) * T) / (v * Math.sqrt(T));
    }

    /**
     * Calculate d2 parameter for Black-Scholes formula
     * @param {number} d1 - d1 parameter
     * @param {number} v - Volatility (as decimal)
     * @param {number} T - Time to expiry (in years)
     * @returns {number} d2 parameter
     */
    static d2(d1, v, T) {
        return d1 - v * Math.sqrt(T);
    }

    /**
     * Calculate option price and Greeks
     * @param {Object} params - Option parameters
     * @param {number} params.S - Spot price
     * @param {number} params.K - Strike price
     * @param {number} params.r - Risk-free rate (as decimal)
     * @param {number} params.v - Volatility (as decimal)
     * @param {number} params.T - Time to expiry (in years)
     * @param {string} params.type - Option type ('call' or 'put')
     * @returns {Object} Option price and Greeks
     */
    static calculate(params) {
        const { S, K, r, v, T, type } = params;
        
        // Handle edge cases
        if (T <= 0) return this.calculateExpired(params);
        if (v <= 0) return this.calculateZeroVol(params);
        
        const d1Value = this.d1(S, K, r, v, T);
        const d2Value = this.d2(d1Value, v, T);
        
        const Nd1 = this.normalCDF(d1Value);
        const Nd2 = this.normalCDF(d2Value);
        const NNd1 = this.normalCDF(-d1Value);
        const NNd2 = this.normalCDF(-d2Value);
        
        const discount = Math.exp(-r * T);
        const sqrtT = Math.sqrt(T);
        
        let price, delta, gamma, vega, theta, rho;
        
        if (type.toLowerCase() === 'call') {
            price = S * Nd1 - K * discount * Nd2;
            delta = Nd1;
            rho = K * T * discount * Nd2 / 100;
        } else {
            price = K * discount * NNd2 - S * NNd1;
            delta = -NNd1;
            rho = -K * T * discount * NNd2 / 100;
        }
        
        // Greeks common to both calls and puts
        gamma = this.normalPDF(d1Value) / (S * v * sqrtT);
        vega = S * sqrtT * this.normalPDF(d1Value) / 100;
        
        // Theta calculation (divided by 365 to get daily theta)
        const term1 = -(S * v * this.normalPDF(d1Value)) / (2 * sqrtT);
        const term2 = r * K * discount;
        if (type.toLowerCase() === 'call') {
            theta = (term1 - term2 * Nd2) / 365;
        } else {
            theta = (term1 + term2 * NNd2) / 365;
        }
        
        return {
            price: Math.max(0, price),
            delta,
            gamma,
            vega,
            theta,
            rho
        };
    }

    /**
     * Handle expired options
     * @param {Object} params - Option parameters
     * @returns {Object} Option price and Greeks
     */
    static calculateExpired(params) {
        const { S, K, type } = params;
        const isCall = type.toLowerCase() === 'call';
        
        return {
            price: Math.max(0, isCall ? S - K : K - S),
            delta: isCall ? (S > K ? 1 : 0) : (S < K ? -1 : 0),
            gamma: 0,
            vega: 0,
            theta: 0,
            rho: 0
        };
    }

    /**
     * Handle zero volatility case
     * @param {Object} params - Option parameters
     * @returns {Object} Option price and Greeks
     */
    static calculateZeroVol(params) {
        const { S, K, r, T, type } = params;
        const discount = Math.exp(-r * T);
        const isCall = type.toLowerCase() === 'call';
        
        const price = isCall
            ? Math.max(0, S - K * discount)
            : Math.max(0, K * discount - S);
            
        return {
            price,
            delta: isCall ? (S > K * discount ? 1 : 0) : (S < K * discount ? -1 : 0),
            gamma: 0,
            vega: 0,
            theta: -r * K * discount / 365,
            rho: isCall ? K * T * discount / 100 : -K * T * discount / 100
        };
    }
}

// Example usage:
/*
const option = BlackScholes.calculate({
    S: 100,    // Spot price
    K: 100,    // Strike price
    r: 0.05,   // Risk-free rate (5%)
    v: 0.2,    // Volatility (20%)
    T: 1,      // Time to expiry (1 year)
    type: 'call'
});
console.log(option);
*/

export default BlackScholes; 