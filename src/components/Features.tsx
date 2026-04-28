export default function Features() {
  const features = [
    {
      icon: '🚀',
      title: 'Instant Productivity',
      description: 'Access thousands of expertly crafted prompts to 10x your AI workflow instantly.',
      color: 'brand-purple',
    },
    {
      icon: '🤝',
      title: 'Community Driven',
      description: 'Share prompts, get feedback, and collaborate with thousands of AI enthusiasts.',
      color: 'brand-pink',
    },
    {
      icon: '⚡',
      title: 'Smart Organization',
      description: 'Tag, categorize, and search prompts with our intelligent organization system.',
      color: 'brand-cyan',
    },
  ];

  return (
    <section id="features" className="py-24 bg-dark-800/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="text-gradient">Powerful Features</span>
          </h2>
          <p className="text-gray-400 text-xl max-w-2xl mx-auto">
            Everything you need to supercharge your AI workflow in one place.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="glass-card rounded-2xl p-8 hover:neon-border transition-all duration-300 group">
              <div className="text-5xl mb-6">{feature.icon}</div>
              <h3 className="text-2xl font-bold text-white mb-4 group-hover:text-gradient transition-all">
                {feature.title}
              </h3>
              <p className="text-gray-400 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
