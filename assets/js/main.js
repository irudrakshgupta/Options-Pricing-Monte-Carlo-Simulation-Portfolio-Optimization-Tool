import BlackScholes from '../../lib/black-scholes.js';
import MonteCarloEngine from '../../lib/monte-carlo.js';
import PortfolioOptimizer from '../../lib/portfolio-optimizer.js';

// Theme handling
const initTheme = () => {
    const themeToggle = document.getElementById('theme-toggle');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (prefersDark) {
        document.documentElement.classList.add('dark');
    }
    
    themeToggle.addEventListener('click', () => {
        document.documentElement.classList.toggle('dark');
    });
};

// Black-Scholes Calculator
const initBlackScholes = () => {
    const calculateButton = document.getElementById('calculate');
    const inputs = {
        spotPrice: document.getElementById('spot-price'),
        strikePrice: document.getElementById('strike-price'),
        timeToExpiry: document.getElementById('time-to-expiry'),
        volatility: document.getElementById('volatility'),
        riskFreeRate: document.getElementById('risk-free-rate'),
        optionType: document.getElementById('option-type')
    };
    
    calculateButton.addEventListener('click', () => {
        const params = {
            S: parseFloat(inputs.spotPrice.value),
            K: parseFloat(inputs.strikePrice.value),
            T: parseFloat(inputs.timeToExpiry.value),
            v: parseFloat(inputs.volatility.value) / 100,
            r: parseFloat(inputs.riskFreeRate.value) / 100,
            type: inputs.optionType.value
        };
        
        try {
            const result = BlackScholes.calculate(params);
            
            // Update results
            document.getElementById('option-price').textContent = result.price.toFixed(4);
            document.getElementById('delta').textContent = result.delta.toFixed(4);
            document.getElementById('gamma').textContent = result.gamma.toFixed(4);
            document.getElementById('vega').textContent = result.vega.toFixed(4);
            document.getElementById('theta').textContent = result.theta.toFixed(4);
            document.getElementById('rho').textContent = result.rho.toFixed(4);
            
            // Update charts
            updateSensitivityCharts(params, result);
        } catch (error) {
            console.error('Calculation error:', error);
            alert('Please check your inputs and try again.');
        }
    });
};

// Strategy Presets
const strategyDescriptions = {
    'covered-call': {
        description: 'A covered call involves holding a long position in the underlying asset while selling a call option on that same asset. This strategy provides income through option premiums while limiting upside potential.',
        maxProfit: 'Limited to strike price - entry price + premium received',
        maxLoss: 'Stock price can fall to zero, offset partially by premium received',
        breakeven: 'Stock purchase price - premium received'
    },
    'cash-secured-put': {
        description: 'A cash-secured put involves selling a put option while maintaining enough cash to buy the stock if assigned. This strategy generates income through option premiums while potentially acquiring the stock at a lower price.',
        maxProfit: 'Limited to premium received',
        maxLoss: 'Strike price - premium received (if stock goes to zero)',
        breakeven: 'Strike price - premium received'
    },
    'long-leaps': {
        description: 'LEAPS (Long-term Equity AnticiPation Securities) are long-term call options, typically with expiration dates longer than one year. This strategy provides leveraged exposure to the underlying asset.',
        maxProfit: 'Unlimited',
        maxLoss: 'Limited to premium paid',
        breakeven: 'Strike price + premium paid'
    },
    'strangle': {
        description: 'A strangle involves buying an out-of-the-money call and an out-of-the-money put with the same expiration. This strategy profits from large price movements in either direction.',
        maxProfit: 'Unlimited',
        maxLoss: 'Limited to total premium paid',
        breakeven: 'Two points: Upper strike + total premium, Lower strike - total premium'
    }
};

const initStrategyPresets = () => {
    const strategySelect = document.getElementById('strategy-select');
    const descriptionDiv = document.getElementById('strategy-description');
    
    strategySelect.addEventListener('change', () => {
        const strategy = strategyDescriptions[strategySelect.value];
        descriptionDiv.innerHTML = `
            <p class="mb-2">${strategy.description}</p>
            <ul class="list-disc pl-4">
                <li>Max Profit: ${strategy.maxProfit}</li>
                <li>Max Loss: ${strategy.maxLoss}</li>
                <li>Breakeven: ${strategy.breakeven}</li>
            </ul>
        `;
        updatePayoffDiagram(strategySelect.value);
    });
    
    // Initialize with first strategy
    strategySelect.dispatchEvent(new Event('change'));
};

// Chart initialization and updates
const initCharts = () => {
    // Initialize all chart canvases with Chart.js
    const payoffChart = new Chart(document.getElementById('payoff-diagram'), {
        type: 'line',
        data: {
            labels: [],
            datasets: []
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Strategy Payoff Diagram'
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Underlying Price'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Profit/Loss'
                    }
                }
            }
        }
    });
    
    const growthChart = new Chart(document.getElementById('growth-chart'), {
        type: 'line',
        data: {
            labels: [],
            datasets: []
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Portfolio Growth Projection'
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Time'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Portfolio Value'
                    }
                }
            }
        }
    });
    
    const efficientFrontierChart = new Chart(document.getElementById('efficient-frontier'), {
        type: 'scatter',
        data: {
            datasets: []
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Efficient Frontier'
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Risk (Standard Deviation)'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Expected Return'
                    }
                }
            }
        }
    });
    
    return { payoffChart, growthChart, efficientFrontierChart };
};

// Update chart functions
const updatePayoffDiagram = (strategyType) => {
    const chart = charts.payoffChart;
    const spotPrice = parseFloat(document.getElementById('spot-price').value) || 100;
    const prices = Array.from({length: 100}, (_, i) => spotPrice * (0.5 + i/50));
    
    let payoff;
    switch(strategyType) {
        case 'covered-call':
            payoff = calculateCoveredCallPayoff(prices, spotPrice);
            break;
        case 'cash-secured-put':
            payoff = calculateCashSecuredPutPayoff(prices, spotPrice);
            break;
        case 'long-leaps':
            payoff = calculateLongLeapsPayoff(prices, spotPrice);
            break;
        case 'strangle':
            payoff = calculateStranglePayoff(prices, spotPrice);
            break;
    }
    
    chart.data.labels = prices.map(p => p.toFixed(2));
    chart.data.datasets = [{
        label: 'Payoff',
        data: payoff,
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1
    }];
    chart.update();
};

// Payoff calculation functions
const calculateCoveredCallPayoff = (prices, spotPrice) => {
    const strikePrice = spotPrice * 1.1; // 10% OTM
    const premium = BlackScholes.calculate({
        S: spotPrice,
        K: strikePrice,
        T: 1/12, // 1 month
        v: 0.2,
        r: 0.05,
        type: 'call'
    }).price;
    
    return prices.map(price => {
        const stockProfit = price - spotPrice;
        const optionPayoff = -Math.max(0, price - strikePrice);
        return stockProfit + optionPayoff + premium;
    });
};

const calculateCashSecuredPutPayoff = (prices, spotPrice) => {
    const strikePrice = spotPrice * 0.9; // 10% ITM
    const premium = BlackScholes.calculate({
        S: spotPrice,
        K: strikePrice,
        T: 1/12,
        v: 0.2,
        r: 0.05,
        type: 'put'
    }).price;
    
    return prices.map(price => {
        const putPayoff = -Math.max(0, strikePrice - price);
        return putPayoff + premium;
    });
};

const calculateLongLeapsPayoff = (prices, spotPrice) => {
    const strikePrice = spotPrice;
    const premium = BlackScholes.calculate({
        S: spotPrice,
        K: strikePrice,
        T: 2, // 2 years
        v: 0.2,
        r: 0.05,
        type: 'call'
    }).price;
    
    return prices.map(price => Math.max(0, price - strikePrice) - premium);
};

const calculateStranglePayoff = (prices, spotPrice) => {
    const callStrike = spotPrice * 1.1;
    const putStrike = spotPrice * 0.9;
    
    const callPremium = BlackScholes.calculate({
        S: spotPrice,
        K: callStrike,
        T: 1/12,
        v: 0.2,
        r: 0.05,
        type: 'call'
    }).price;
    
    const putPremium = BlackScholes.calculate({
        S: spotPrice,
        K: putStrike,
        T: 1/12,
        v: 0.2,
        r: 0.05,
        type: 'put'
    }).price;
    
    const totalPremium = callPremium + putPremium;
    
    return prices.map(price => {
        const callPayoff = Math.max(0, price - callStrike);
        const putPayoff = Math.max(0, putStrike - price);
        return callPayoff + putPayoff - totalPremium;
    });
};

// Portfolio optimization
const initPortfolioOptimizer = () => {
    const addStrategyButton = document.getElementById('add-strategy');
    const optimizeButton = document.getElementById('optimize-portfolio');
    const strategyInputs = document.getElementById('strategy-inputs');
    
    addStrategyButton.addEventListener('click', () => {
        const strategyDiv = document.createElement('div');
        strategyDiv.className = 'grid grid-cols-3 gap-2';
        strategyDiv.innerHTML = `
            <input type="text" placeholder="Strategy Name" class="col-span-1">
            <input type="number" placeholder="Expected Return (%)" class="col-span-1">
            <input type="number" placeholder="Volatility (%)" class="col-span-1">
        `;
        strategyInputs.appendChild(strategyDiv);
    });
    
    optimizeButton.addEventListener('click', () => {
        const strategies = Array.from(strategyInputs.children).map(div => {
            const inputs = div.getElementsByTagName('input');
            return {
                name: inputs[0].value,
                return: parseFloat(inputs[1].value) / 100,
                volatility: parseFloat(inputs[2].value) / 100
            };
        });
        
        if (strategies.length < 2) {
            alert('Please add at least 2 strategies to optimize.');
            return;
        }
        
        const returns = strategies.map(s => s.return);
        const volatilities = strategies.map(s => s.volatility);
        const covariance = generateCovarianceMatrix(volatilities);
        
        const frontier = PortfolioOptimizer.generateEfficientFrontier({
            returns,
            covariance,
            riskFreeRate: 0.03,
            points: 50
        });
        
        updateEfficientFrontier(frontier, strategies);
    });
};

// Helper function to generate a sample covariance matrix
const generateCovarianceMatrix = (volatilities) => {
    const n = volatilities.length;
    const correlation = 0.5; // Sample correlation coefficient
    const matrix = Array(n).fill().map(() => Array(n).fill(0));
    
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            if (i === j) {
                matrix[i][j] = volatilities[i] * volatilities[i];
            } else {
                matrix[i][j] = volatilities[i] * volatilities[j] * correlation;
            }
        }
    }
    
    return matrix;
};

// Update efficient frontier chart
const updateEfficientFrontier = (frontier, strategies) => {
    const chart = charts.efficientFrontierChart;
    
    chart.data.datasets = [
        {
            label: 'Efficient Frontier',
            data: frontier.map(point => ({
                x: point.risk,
                y: point.return
            })),
            borderColor: 'rgb(75, 192, 192)',
            backgroundColor: 'rgba(75, 192, 192, 0.5)'
        },
        {
            label: 'Individual Strategies',
            data: strategies.map(strategy => ({
                x: strategy.volatility,
                y: strategy.return
            })),
            borderColor: 'rgb(255, 99, 132)',
            backgroundColor: 'rgb(255, 99, 132)',
            pointRadius: 5
        }
    ];
    
    chart.update();
};

// Initialize everything
const charts = initCharts();
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initBlackScholes();
    initStrategyPresets();
    initPortfolioOptimizer();
}); 