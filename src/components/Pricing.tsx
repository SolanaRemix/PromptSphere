import Link from 'next/link';

export default function Pricing() {
  const plans = [
    {
      name: 'Free',
      price: '$0',
      period: 'forever',
      description: 'Perfect for getting started',
      features: ['10 prompts', 'Basic search', 'Community access', 'Email support'],
      cta: 'Get Started',
      highlighted: false,
    },
    {
      name: 'Starter',
      price: '$19',
      period: '/month',
      description: 'Great for individuals',
      features: ['100 prompts', 'Advanced search', 'Priority support', 'Analytics', 'API access'],
      cta: 'Start Free Trial',
      highlighted: true,
    },
    {
      name: 'Pro',
      price: '$49',
      period: '/month',
      description: 'For power users & teams',
      features: ['Unlimited prompts', 'Team collaboration', 'Custom branding', 'Advanced analytics', 'Dedicated support', 'White-label export'],
      cta: 'Go Pro',
      highlighted: false,
    },
  ];

  return (
    <section id="pricing" className="py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="text-gradient">Simple Pricing</span>
          </h2>
          <p className="text-gray-400 text-xl max-w-2xl mx-auto">
            Choose the plan that works best for you. Upgrade or downgrade at any time.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`rounded-2xl p-8 flex flex-col ${
                plan.highlighted
                  ? 'btn-gradient neon-border relative'
                  : 'glass-card'
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-white text-dark-900 rounded-full text-sm font-bold">
                  Most Popular
                </div>
              )}
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-white">{plan.price}</span>
                  <span className="text-gray-300">{plan.period}</span>
                </div>
                <p className="text-gray-300 mt-2">{plan.description}</p>
              </div>

              <ul className="space-y-3 flex-1 mb-8">
                {plan.features.map((feature, fi) => (
                  <li key={fi} className="flex items-center gap-3 text-gray-200">
                    <span className="text-green-400">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>

              <Link
                href="/login"
                className={`text-center py-3 rounded-xl font-semibold transition-all ${
                  plan.highlighted
                    ? 'bg-white text-dark-900 hover:bg-gray-100'
                    : 'btn-gradient hover:opacity-90'
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
