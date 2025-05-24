/**
 * Monte Carlo Simulation Engine
 * Implements geometric Brownian motion for asset price simulation
 * and Monte Carlo option pricing
 */

class MonteCarloEngine {
    /**
     * Generate a single price path using geometric Brownian motion
     * @param {Object} params - Simulation parameters
     * @param {number} params.S0 - Initial price
     * @param {number} params.mu - Drift (usually risk-free rate)
     * @param {number} params.sigma - Volatility
     * @param {number} params.T - Time horizon
     * @param {number} params.steps - Number of time steps
     * @returns {Array<number>} Price path
     */
    static generatePath(params) {
        const { S0, mu, sigma, T, steps } = params;
        const dt = T / steps;
        const path = [S0];
        
        for (let i = 1; i <= steps; i++) {
            const previousPrice = path[i - 1];
            const randomNormal = this.boxMuller(); // Generate standard normal random number
            
            // Geometric Brownian Motion formula
            const drift = (mu - 0.5 * sigma * sigma) * dt;
            const diffusion = sigma * Math.sqrt(dt) * randomNormal;
            const newPrice = previousPrice * Math.exp(drift + diffusion);
            
            path.push(newPrice);
        }
        
        return path;
    }

    /**
     * Generate multiple price paths
     * @param {Object} params - Simulation parameters
     * @param {number} params.paths - Number of paths to generate
     * @returns {Array<Array<number>>} Array of price paths
     */
    static generatePaths(params) {
        const { paths } = params;
        const allPaths = [];
        
        for (let i = 0; i < paths; i++) {
            allPaths.push(this.generatePath(params));
        }
        
        return allPaths;
    }

    /**
     * Price an option using Monte Carlo simulation
     * @param {Object} params - Option and simulation parameters
     * @param {number} params.S0 - Initial price
     * @param {number} params.K - Strike price
     * @param {number} params.r - Risk-free rate
     * @param {number} params.sigma - Volatility
     * @param {number} params.T - Time to expiry
     * @param {number} params.paths - Number of paths
     * @param {number} params.steps - Number of time steps
     * @param {string} params.type - Option type ('call' or 'put')
     * @param {string} params.style - Option style ('european' or 'american')
     * @returns {Object} Option price and confidence interval
     */
    static priceOption(params) {
        const { S0, K, r, sigma, T, paths, type, style } = params;
        const simulationPaths = this.generatePaths({
            ...params,
            mu: r // Use risk-free rate as drift for risk-neutral pricing
        });
        
        // Calculate payoffs for each path
        const payoffs = simulationPaths.map(path => {
            const finalPrice = path[path.length - 1];
            if (type.toLowerCase() === 'call') {
                return Math.max(0, finalPrice - K);
            } else {
                return Math.max(0, K - finalPrice);
            }
        });
        
        // Calculate mean payoff and discount
        const meanPayoff = payoffs.reduce((sum, payoff) => sum + payoff, 0) / paths;
        const price = meanPayoff * Math.exp(-r * T);
        
        // Calculate standard error and confidence interval
        const variance = payoffs.reduce((sum, payoff) => {
            return sum + Math.pow(payoff - meanPayoff, 2);
        }, 0) / (paths - 1);
        
        const standardError = Math.sqrt(variance / paths);
        const confidenceInterval = {
            lower: price - 1.96 * standardError * Math.exp(-r * T),
            upper: price + 1.96 * standardError * Math.exp(-r * T)
        };
        
        return {
            price,
            confidenceInterval,
            standardError: standardError * Math.exp(-r * T)
        };
    }

    /**
     * Box-Muller transform for generating standard normal random numbers
     * @returns {number} Standard normal random number
     */
    static boxMuller() {
        let u1, u2;
        do {
            u1 = Math.random();
            u2 = Math.random();
        } while (u1 <= Number.EPSILON); // Avoid log(0)
        
        const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
        return z0;
    }

    /**
     * Calculate Value at Risk (VaR) from simulated paths
     * @param {Array<Array<number>>} paths - Simulated price paths
     * @param {number} confidence - Confidence level (e.g., 0.95 for 95% VaR)
     * @param {number} initialValue - Initial portfolio value
     * @returns {Object} VaR and CVaR metrics
     */
    static calculateRiskMetrics(paths, confidence, initialValue) {
        // Calculate returns for each path
        const returns = paths.map(path => {
            const finalPrice = path[path.length - 1];
            return (finalPrice - path[0]) / path[0];
        });
        
        // Sort returns for percentile calculation
        returns.sort((a, b) => a - b);
        
        // Calculate VaR
        const varIndex = Math.floor(returns.length * (1 - confidence));
        const var95 = -returns[varIndex] * initialValue;
        
        // Calculate CVaR (Expected Shortfall)
        const cvar = -returns
            .slice(0, varIndex)
            .reduce((sum, ret) => sum + ret, 0) / varIndex * initialValue;
        
        return {
            valueAtRisk: var95,
            conditionalVaR: cvar,
            worstReturn: returns[0],
            bestReturn: returns[returns.length - 1]
        };
    }
}

// Example usage:
/*
const simulation = MonteCarloEngine.priceOption({
    S0: 100,    // Initial price
    K: 100,     // Strike price
    r: 0.05,    // Risk-free rate (5%)
    sigma: 0.2,  // Volatility (20%)
    T: 1,       // Time to expiry (1 year)
    paths: 10000,// Number of simulation paths
    steps: 252,  // Number of time steps (daily)
    type: 'call',
    style: 'european'
});
console.log(simulation);
*/

export default MonteCarloEngine; 