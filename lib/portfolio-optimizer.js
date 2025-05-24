/**
 * Portfolio Optimizer
 * Implements Modern Portfolio Theory (MPT) for portfolio optimization
 * and efficient frontier calculation
 */

class PortfolioOptimizer {
    /**
     * Calculate portfolio return and risk metrics
     * @param {Object} params - Portfolio parameters
     * @param {Array<number>} params.weights - Asset weights
     * @param {Array<number>} params.returns - Expected returns
     * @param {Array<Array<number>>} params.covariance - Covariance matrix
     * @returns {Object} Portfolio metrics
     */
    static calculatePortfolioMetrics(params) {
        const { weights, returns, covariance } = params;
        
        // Calculate portfolio return
        const portfolioReturn = weights.reduce((sum, weight, i) => {
            return sum + weight * returns[i];
        }, 0);
        
        // Calculate portfolio variance
        let portfolioVariance = 0;
        for (let i = 0; i < weights.length; i++) {
            for (let j = 0; j < weights.length; j++) {
                portfolioVariance += weights[i] * weights[j] * covariance[i][j];
            }
        }
        
        const portfolioStdDev = Math.sqrt(portfolioVariance);
        
        return {
            return: portfolioReturn,
            risk: portfolioStdDev,
            variance: portfolioVariance
        };
    }

    /**
     * Calculate Sharpe Ratio
     * @param {number} portfolioReturn - Portfolio return
     * @param {number} portfolioRisk - Portfolio risk (standard deviation)
     * @param {number} riskFreeRate - Risk-free rate
     * @returns {number} Sharpe Ratio
     */
    static calculateSharpeRatio(portfolioReturn, portfolioRisk, riskFreeRate) {
        return (portfolioReturn - riskFreeRate) / portfolioRisk;
    }

    /**
     * Calculate Sortino Ratio
     * @param {number} portfolioReturn - Portfolio return
     * @param {number} downsideDeviation - Downside deviation
     * @param {number} riskFreeRate - Risk-free rate
     * @returns {number} Sortino Ratio
     */
    static calculateSortinoRatio(portfolioReturn, downsideDeviation, riskFreeRate) {
        return (portfolioReturn - riskFreeRate) / downsideDeviation;
    }

    /**
     * Calculate downside deviation
     * @param {Array<number>} returns - Array of returns
     * @param {number} targetReturn - Minimum acceptable return
     * @returns {number} Downside deviation
     */
    static calculateDownsideDeviation(returns, targetReturn) {
        const squaredDownsideDeviations = returns
            .filter(r => r < targetReturn)
            .map(r => Math.pow(targetReturn - r, 2));
        
        if (squaredDownsideDeviations.length === 0) return 0;
        
        const meanSquaredDeviation = squaredDownsideDeviations.reduce((sum, val) => sum + val, 0) 
            / squaredDownsideDeviations.length;
            
        return Math.sqrt(meanSquaredDeviation);
    }

    /**
     * Calculate maximum drawdown
     * @param {Array<number>} prices - Array of prices
     * @returns {Object} Maximum drawdown metrics
     */
    static calculateMaxDrawdown(prices) {
        let maxDrawdown = 0;
        let peak = prices[0];
        let peakIndex = 0;
        let troughIndex = 0;
        
        for (let i = 1; i < prices.length; i++) {
            if (prices[i] > peak) {
                peak = prices[i];
                peakIndex = i;
            }
            
            const drawdown = (peak - prices[i]) / peak;
            if (drawdown > maxDrawdown) {
                maxDrawdown = drawdown;
                troughIndex = i;
            }
        }
        
        return {
            maxDrawdown,
            peakIndex,
            troughIndex
        };
    }

    /**
     * Generate efficient frontier points
     * @param {Object} params - Optimization parameters
     * @param {Array<number>} params.returns - Expected returns
     * @param {Array<Array<number>>} params.covariance - Covariance matrix
     * @param {number} params.riskFreeRate - Risk-free rate
     * @param {number} params.points - Number of points to generate
     * @returns {Array<Object>} Efficient frontier points
     */
    static generateEfficientFrontier(params) {
        const { returns, covariance, riskFreeRate, points } = params;
        const n = returns.length;
        
        // Find minimum and maximum returns
        const minReturn = Math.min(...returns);
        const maxReturn = Math.max(...returns);
        const returnStep = (maxReturn - minReturn) / (points - 1);
        
        const frontier = [];
        
        for (let i = 0; i < points; i++) {
            const targetReturn = minReturn + i * returnStep;
            
            // Find optimal weights for this target return
            const weights = this.optimizePortfolio({
                returns,
                covariance,
                targetReturn,
                constraints: {
                    sumToOne: true,
                    nonNegative: true
                }
            });
            
            const metrics = this.calculatePortfolioMetrics({
                weights,
                returns,
                covariance
            });
            
            frontier.push({
                weights,
                return: metrics.return,
                risk: metrics.risk,
                sharpe: this.calculateSharpeRatio(metrics.return, metrics.risk, riskFreeRate)
            });
        }
        
        return frontier;
    }

    /**
     * Optimize portfolio weights for target return
     * Uses a simple gradient descent approach
     * @param {Object} params - Optimization parameters
     * @returns {Array<number>} Optimal weights
     */
    static optimizePortfolio(params) {
        const { returns, covariance, targetReturn, constraints } = params;
        const n = returns.length;
        
        // Initialize with equal weights
        let weights = Array(n).fill(1/n);
        const learningRate = 0.01;
        const iterations = 1000;
        
        for (let iter = 0; iter < iterations; iter++) {
            // Calculate gradients
            const gradients = this.calculateGradients(weights, returns, covariance);
            
            // Update weights
            weights = weights.map((w, i) => w - learningRate * gradients[i]);
            
            // Apply constraints
            if (constraints.nonNegative) {
                weights = weights.map(w => Math.max(0, w));
            }
            if (constraints.sumToOne) {
                const sum = weights.reduce((a, b) => a + b, 0);
                weights = weights.map(w => w / sum);
            }
            
            // Check if target return is met
            const currentReturn = weights.reduce((sum, w, i) => sum + w * returns[i], 0);
            if (Math.abs(currentReturn - targetReturn) < 0.0001) break;
        }
        
        return weights;
    }

    /**
     * Calculate gradients for optimization
     * @param {Array<number>} weights - Current weights
     * @param {Array<number>} returns - Expected returns
     * @param {Array<Array<number>>} covariance - Covariance matrix
     * @returns {Array<number>} Gradients
     */
    static calculateGradients(weights, returns, covariance) {
        const n = weights.length;
        const gradients = Array(n).fill(0);
        
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                gradients[i] += weights[j] * covariance[i][j];
            }
        }
        
        return gradients;
    }
}

// Example usage:
/*
const optimizer = new PortfolioOptimizer();
const frontier = optimizer.generateEfficientFrontier({
    returns: [0.1, 0.15, 0.12, 0.09],
    covariance: [
        [0.04, 0.02, 0.01, 0.02],
        [0.02, 0.05, 0.02, 0.01],
        [0.01, 0.02, 0.03, 0.015],
        [0.02, 0.01, 0.015, 0.025]
    ],
    riskFreeRate: 0.03,
    points: 100
});
console.log(frontier);
*/

export default PortfolioOptimizer; 