import laptop from '@/assets/laptop.jpg';
import computersHero from '@/assets/computers-hero.jpg';

export interface Product {
  id: number;
  name: string;
  price?: number;
  originalPrice?: number;
  image: string;
  images?: string[];
  category: string;
  isNew?: boolean;
  isPromotion?: boolean;
  hasQuote?: boolean;
  rating: number;
  reviews: number;
  description: string;
  features: string[];
  specifications: Record<string, string>;
}

export const allProducts: Product[] = [
  // Laptops
  {
    id: 1,
    name: "Laptop ASUS VivoBook 15 - Intel i7, 16GB RAM, 512GB SSD",
    price: 89000,
    originalPrice: 95000,
    image: laptop,
    images: [
      laptop,
      computersHero,
      "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=600&h=400&fit=crop&crop=center"
    ],
    category: "Laptops",
    isPromotion: true,
    rating: 4.6,
    reviews: 47,
    description: "Laptop ASUS VivoBook 15 com processador Intel Core i7 de última geração, 16GB de RAM e SSD de 512GB. Ideal para trabalho, estudos e entretenimento com excelente desempenho.",
    features: [
      "Processador Intel Core i7-12700H",
      "16GB RAM DDR4",
      "SSD NVMe 512GB",
      "Tela 15.6'' Full HD IPS",
      "Placa de vídeo integrada Intel Iris",
      "Bateria de longa duração",
      "Garantia: 12 meses"
    ],
    specifications: {
      "Processador": "Intel Core i7-12700H",
      "Memória": "16GB DDR4",
      "Armazenamento": "SSD 512GB NVMe",
      "Tela": "15.6'' Full HD IPS",
      "Placa de Vídeo": "Intel Iris Xe",
      "Sistema": "Windows 11"
    }
  },
  {
    id: 2,
    name: "Desktop Gaming Intel i5 + GTX 1660 Super",
    price: 125000,
    image: "https://images.unsplash.com/photo-1587831990711-23ca6441447b?w=400&h=300&fit=crop&crop=center",
    images: [
      "https://images.unsplash.com/photo-1587831990711-23ca6441447b?w=600&h=400&fit=crop&crop=center",
      computersHero,
      "https://images.unsplash.com/photo-1593640495253-23196b27a87f?w=600&h=400&fit=crop&crop=center"
    ],
    category: "Desktops",
    isNew: true,
    rating: 4.8,
    reviews: 15,
    description: "Desktop gamer completo com processador Intel i5, placa de vídeo GTX 1660 Super e 16GB de RAM. Perfeito para jogos, design gráfico e aplicações profissionais exigentes.",
    features: [
      "Intel Core i5-12400F",
      "NVIDIA GTX 1660 Super 6GB",
      "16GB RAM DDR4 3200MHz",
      "SSD 480GB + HD 1TB",
      "Fonte 600W 80+ Bronze",
      "Gabinete gamer com RGB",
      "Garantia: 12 meses"
    ],
    specifications: {
      "Processador": "Intel Core i5-12400F",
      "Placa de Vídeo": "NVIDIA GTX 1660 Super 6GB",
      "Memória": "16GB DDR4 3200MHz",
      "Armazenamento": "SSD 480GB + HD 1TB",
      "Fonte": "600W 80+ Bronze",
      "Sistema": "Windows 11"
    }
  },
  {
    id: 3,
    name: "Monitor Samsung 24'' Full HD VA Gaming",
    price: 22000,
    image: "https://images.unsplash.com/photo-1593640495253-23196b27a87f?w=400&h=300&fit=crop&crop=center",
    images: [
      "https://images.unsplash.com/photo-1593640495253-23196b27a87f?w=600&h=400&fit=crop&crop=center",
      "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=600&h=400&fit=crop&crop=center"
    ],
    category: "Monitores",
    rating: 4.4,
    reviews: 56,
    description: "Monitor Samsung 24 polegadas com painel VA curvo, taxa de atualização de 144Hz e tempo de resposta de 1ms. Ideal para gaming, trabalho e entretenimento.",
    features: [
      "Tamanho: 24 polegadas",
      "Resolução: Full HD 1920x1080",
      "Taxa de atualização: 144Hz",
      "Tempo de resposta: 1ms",
      "Painel VA curvo",
      "FreeSync Premium",
      "Garantia: 12 meses"
    ],
    specifications: {
      "Tamanho": "24 polegadas",
      "Resolução": "1920 x 1080 Full HD",
      "Taxa de atualização": "144Hz",
      "Tempo de resposta": "1ms MPRT",
      "Tipo de painel": "VA curvo",
      "Conectividade": "HDMI, DisplayPort"
    }
  },
  {
    id: 4,
    name: "Kit Gaming Teclado + Mouse RGB Mecânico",
    price: 8500,
    originalPrice: 12000,
    image: "https://images.unsplash.com/photo-1541140532154-b024d705b90a?w=400&h=300&fit=crop&crop=center",
    images: [
      "https://images.unsplash.com/photo-1541140532154-b024d705b90a?w=600&h=400&fit=crop&crop=center",
      "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600&h=400&fit=crop&crop=center"
    ],
    category: "Acessórios",
    isPromotion: true,
    rating: 4.5,
    reviews: 89,
    description: "Kit gamer completo com teclado mecânico RGB e mouse óptico de alta precisão. Switches Blue, iluminação personalizável e design ergonômico para longas sessões de uso.",
    features: [
      "Teclado mecânico switches Blue",
      "Mouse óptico 6400 DPI",
      "Iluminação RGB personalizável",
      "Design anti-ghosting",
      "Cabo trançado resistente",
      "Software de personalização",
      "Garantia: 12 meses"
    ],
    specifications: {
      "Tipo de switches": "Mecânico Blue",
      "DPI do mouse": "6400 DPI ajustável",
      "Iluminação": "RGB 16.7 milhões de cores",
      "Conectividade": "USB 2.0",
      "Compatibilidade": "Windows, macOS, Linux",
      "Cabo": "1.8m trançado"
    }
  },
  {
    id: 5,
    name: "Notebook HP Pavilion 14'' - AMD Ryzen 5, 12GB, 1TB",
    price: 75000,
    image: "https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=400&h=300&fit=crop&crop=center",
    images: [
      "https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=600&h=400&fit=crop&crop=center",
      "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=600&h=400&fit=crop&crop=center"
    ],
    category: "Laptops",
    isNew: true,
    rating: 4.3,
    reviews: 28,
    description: "Notebook HP Pavilion com processador AMD Ryzen 5, ideal para estudantes e profissionais. Design moderno e performance confiável para tarefas do dia a dia.",
    features: [
      "Processador AMD Ryzen 5 5500U",
      "12GB RAM DDR4",
      "HD 1TB",
      "Tela 14'' HD",
      "Placa de vídeo integrada AMD",
      "Webcam HD",
      "Garantia: 12 meses"
    ],
    specifications: {
      "Processador": "AMD Ryzen 5 5500U",
      "Memória": "12GB DDR4",
      "Armazenamento": "HD 1TB",
      "Tela": "14'' HD",
      "Placa de Vídeo": "AMD Radeon Graphics",
      "Sistema": "Windows 11"
    }
  },
  {
    id: 6,
    name: "Impressora 3D Creality Ender 3 V2",
    price: 45000,
    originalPrice: 52000,
    image: "https://images.unsplash.com/photo-1606011334315-025e4baab810?w=400&h=300&fit=crop&crop=center",
    images: [
      "https://images.unsplash.com/photo-1606011334315-025e4baab810?w=600&h=400&fit=crop&crop=center",
      "https://images.unsplash.com/photo-1612198188060-c7c2a3b66eae?w=600&h=400&fit=crop&crop=center"
    ],
    category: "Impressoras 3D",
    isPromotion: true,
    rating: 4.6,
    reviews: 67,
    description: "Impressora 3D Creality Ender 3 V2 com excelente qualidade de impressão. Perfeita para hobbyistas, estudantes e profissionais que trabalham com prototipagem.",
    features: [
      "Volume de impressão: 220x220x250mm",
      "Precisão: ±0.1mm",
      "Velocidade: até 180mm/s",
      "Filamento: PLA, ABS, PETG",
      "Display colorido",
      "Mesa aquecida",
      "Garantia: 12 meses"
    ],
    specifications: {
      "Volume de impressão": "220 x 220 x 250 mm",
      "Precisão": "±0.1mm",
      "Velocidade máxima": "180mm/s",
      "Tipos de filamento": "PLA, ABS, PETG",
      "Conectividade": "USB, cartão SD",
      "Voltagem": "110V/220V"
    }
  },
  {
    id: 7,
    name: "Webcam Logitech C920 Full HD 1080p",
    price: 12000,
    image: "https://images.unsplash.com/photo-1587654780291-39c9404d746b?w=400&h=300&fit=crop&crop=center",
    images: [
      "https://images.unsplash.com/photo-1587654780291-39c9404d746b?w=600&h=400&fit=crop&crop=center",
      "https://images.unsplash.com/photo-1611532736797-de8ad4943838?w=600&h=400&fit=crop&crop=center"
    ],
    category: "Acessórios",
    rating: 4.7,
    reviews: 134,
    description: "Webcam Logitech C920 com qualidade Full HD 1080p. Ideal para videoconferências, streaming e gravação de vídeos com qualidade profissional.",
    features: [
      "Resolução Full HD 1080p",
      "30 fps",
      "Foco automático",
      "Microfone estéreo",
      "Correção de luz automática",
      "Compatível com Zoom, Teams, Skype",
      "Garantia: 12 meses"
    ],
    specifications: {
      "Resolução": "1920 x 1080 Full HD",
      "Taxa de quadros": "30 fps",
      "Campo de visão": "78°",
      "Foco": "Automático",
      "Microfone": "Dual estéreo",
      "Conectividade": "USB 2.0"
    }
  },
  {
    id: 8,
    name: "SSD Kingston NV2 500GB NVMe",
    price: 8500,
    image: "https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=400&h=300&fit=crop&crop=center",
    images: [
      "https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=600&h=400&fit=crop&crop=center",
      "https://images.unsplash.com/photo-1615494488345-3a2297a3b4b1?w=600&h=400&fit=crop&crop=center"
    ],
    category: "Armazenamento",
    rating: 4.5,
    reviews: 203,
    description: "SSD Kingston NV2 500GB NVMe com excelente velocidade de leitura e escrita. Upgrade perfeito para melhorar significativamente a performance do seu computador.",
    features: [
      "Capacidade: 500GB",
      "Interface NVMe PCIe 4.0",
      "Velocidade de leitura: até 3.500 MB/s",
      "Velocidade de escrita: até 2.100 MB/s",
      "Formato M.2 2280",
      "Baixo consumo de energia",
      "Garantia: 36 meses"
    ],
    specifications: {
      "Capacidade": "500GB",
      "Interface": "NVMe PCIe 4.0",
      "Velocidade de leitura": "3.500 MB/s",
      "Velocidade de escrita": "2.100 MB/s",
      "Formato": "M.2 2280",
      "Durabilidade": "240 TBW"
    }
  }
];

export const getProductById = (id: number): Product | undefined => {
  return allProducts.find(product => product.id === id);
};

export const getProductsByCategory = (category: string): Product[] => {
  return allProducts.filter(product => product.category === category);
};

export const getFeaturedProducts = () => {
  return {
    laptops: allProducts.filter(p => p.category === 'Laptops'),
    desktops: allProducts.filter(p => ['Desktops', 'Monitores', 'Acessórios'].includes(p.category)),
    accessories: allProducts.filter(p => ['Acessórios', 'Armazenamento', 'Impressoras 3D'].includes(p.category))
  };
};

export const getBestSellers = (): Product[] => {
  return allProducts.filter(p => [1, 2, 3, 4, 5, 6, 7, 8].includes(p.id));
};
