from django.db import models
from django.utils import timezone
from django.utils.text import slugify
from django.core.validators import MinValueValidator, MaxValueValidator
import os
import uuid

def product_image_upload_path(instance, filename):
    """Generate upload path for product images.

    Avoids using 'None' in the path when the instance hasn't been saved yet.
    For ProductImage, prefer the related product_id; for Product fallback to a temp bucket.
    """
    # Normalize extension and generate unique filename
    ext = filename.split('.')[-1].lower() if '.' in filename else 'jpg'
    filename = f'{uuid.uuid4().hex}.{ext}'

    # Prefer grouping by product id when available (for ProductImage instances)
    product_id = getattr(instance, 'product_id', None)
    if product_id:
        return f'products/{product_id}/{filename}'

    # Use instance pk when available (for Product instances updating images later)
    owner_id = getattr(instance, 'id', None) or getattr(instance, 'pk', None)
    if owner_id:
        return f'products/{owner_id}/{filename}'

    # Fallback: use a temporary bucket to avoid 'None' in path
    tmp_bucket = uuid.uuid4().hex[:8]
    return f'products/tmp/{tmp_bucket}/{filename}'

def review_image_upload_path(instance, filename):
    """Generate upload path for review images"""
    ext = filename.split('.')[-1]
    filename = f'{uuid.uuid4().hex}.{ext}'
    # Use review_id to avoid accessing related object properties
    review_id = instance.review_id or 'tmp'
    return f'reviews/{review_id}/{filename}'

def generate_sku(name, brand=""):
    """Generate SKU from product name and brand"""
    # Clean and prepare name
    name_clean = slugify(name).replace('-', '').upper()[:6]
    brand_clean = slugify(brand).replace('-', '').upper()[:3] if brand else ""
    
    # Generate random suffix for uniqueness
    random_suffix = str(uuid.uuid4().hex)[:4].upper()
    
    if brand_clean:
        return f"{brand_clean}-{name_clean}-{random_suffix}"
    else:
        return f"{name_clean}-{random_suffix}"

class Color(models.Model):
    """Color model for products"""
    name = models.CharField(max_length=50, unique=True, verbose_name="Nome da Cor")
    hex_code = models.CharField(max_length=7, verbose_name="Código Hex", help_text="Ex: #FF0000")
    rgb_code = models.CharField(max_length=20, blank=True, verbose_name="Código RGB", help_text="Ex: rgb(255,0,0)")
    is_active = models.BooleanField(default=True, verbose_name="Ativo")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Criado em")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Atualizado em")
    
    class Meta:
        verbose_name = "Cor"
        verbose_name_plural = "Cores"
        ordering = ['name']
    
    def __str__(self):
        return self.name

class Category(models.Model):
    """Category model for products"""
    name = models.CharField(max_length=100, unique=True, verbose_name="Nome")
    description = models.TextField(blank=True, verbose_name="Descrição")
    # Campo de status que existia no banco (erro mostra constraint NOT NULL). Re-adicionado para alinhar modelo e schema.
    is_active = models.BooleanField(default=True, verbose_name="Ativo")
    # Campo de ordenação que existe no banco (NOT NULL). Re-adicionado para restaurar alinhamento.
    order = models.PositiveIntegerField(default=0, verbose_name="Ordem")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Criado em")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Atualizado em")
    
    class Meta:
        verbose_name = "Categoria"
        verbose_name_plural = "Categorias"
        ordering = ['order', 'name']
    
    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        # Auto-atribuir ordem incremental se não informada ou = 0
        if not self.order or self.order == 0:
            # Evita consultar durante migrações iniciais antes da tabela existir
            try:
                max_order = Category.objects.exclude(pk=self.pk).aggregate(models.Max('order'))['order__max'] or 0
                self.order = max_order + 1
            except Exception:
                # Em cenários de migração inicial apenas mantém default
                if not self.order:
                    self.order = 1
        super().save(*args, **kwargs)

class Subcategory(models.Model):
    """Subcategory model linked to a parent Category"""
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name='subcategories', verbose_name="Categoria Pai")
    name = models.CharField(max_length=100, verbose_name="Nome")
    description = models.TextField(blank=True, verbose_name="Descrição")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Criado em")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Atualizado em")

    class Meta:
        verbose_name = "Subcategoria"
        verbose_name_plural = "Subcategorias"
        ordering = ['name']
        constraints = [
            models.UniqueConstraint(fields=['category', 'name'], name='unique_subcategory_per_category')
        ]

    def __str__(self):
        return f"{self.category.name} > {self.name}"

class Product(models.Model):
    """Product model for the e-commerce system"""
    
    STATUS_CHOICES = [
        ('active', 'Ativo'),
        ('inactive', 'Inativo'),
        ('out_of_stock', 'Fora de Estoque'),
    ]
    
    # Basic Information
    name = models.CharField(max_length=200, verbose_name="Nome do Produto")
    description = models.TextField(verbose_name="Descrição")
    short_description = models.CharField(max_length=300, blank=True, verbose_name="Descrição Curta")
    
    # Category and Organization
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name='products', verbose_name="Categoria")
    subcategory = models.ForeignKey('Subcategory', on_delete=models.SET_NULL, null=True, blank=True, related_name='products', verbose_name="Subcategoria")
    sku = models.CharField(max_length=50, unique=True, blank=True, verbose_name="SKU")
    brand = models.CharField(max_length=100, blank=True, verbose_name="Marca")
    
    # Colors (Many-to-Many relationship)
    colors = models.ManyToManyField(Color, blank=True, verbose_name="Cores Disponíveis")
    
    # Pricing
    price = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="Preço (MZN)")
    original_price = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True, verbose_name="Preço Original")
    is_on_sale = models.BooleanField(default=False, verbose_name="Em Promoção")
    
    # Inventory
    stock_quantity = models.PositiveIntegerField(default=0, verbose_name="Quantidade em Estoque")
    min_stock_level = models.PositiveIntegerField(default=5, verbose_name="Nível Mínimo de Estoque")
    
    # Images
    main_image = models.ImageField(upload_to=product_image_upload_path, blank=True, null=True, verbose_name="Imagem Principal")
    image_2 = models.ImageField(upload_to=product_image_upload_path, blank=True, null=True, verbose_name="Imagem 2")
    image_3 = models.ImageField(upload_to=product_image_upload_path, blank=True, null=True, verbose_name="Imagem 3")
    image_4 = models.ImageField(upload_to=product_image_upload_path, blank=True, null=True, verbose_name="Imagem 4")
    
    # Technical Specifications (JSON field for flexibility)
    specifications = models.JSONField(default=dict, blank=True, verbose_name="Especificações Técnicas")
    
    # SEO and Meta
    meta_title = models.CharField(max_length=60, blank=True, verbose_name="Meta Título")
    meta_description = models.CharField(max_length=160, blank=True, verbose_name="Meta Descrição")
    slug = models.SlugField(max_length=200, unique=True, blank=True, verbose_name="Slug")
    
    # Status and Control
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active', verbose_name="Status")
    is_featured = models.BooleanField(default=False, verbose_name="Produto em Destaque")
    is_bestseller = models.BooleanField(default=False, verbose_name="Mais Vendido")
    
    # Dimensions and Weight
    weight = models.DecimalField(max_digits=8, decimal_places=2, blank=True, null=True, verbose_name="Peso (kg)")
    length = models.DecimalField(max_digits=8, decimal_places=2, blank=True, null=True, verbose_name="Comprimento (cm)")
    width = models.DecimalField(max_digits=8, decimal_places=2, blank=True, null=True, verbose_name="Largura (cm)")
    height = models.DecimalField(max_digits=8, decimal_places=2, blank=True, null=True, verbose_name="Altura (cm)")
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Criado em")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Atualizado em")
    
    # Analytics
    view_count = models.PositiveIntegerField(default=0, verbose_name="Visualizações")
    sales_count = models.PositiveIntegerField(default=0, verbose_name="Vendas")
    
    class Meta:
        verbose_name = "Produto"
        verbose_name_plural = "Produtos"
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', 'category']),
            models.Index(fields=['is_featured']),
            models.Index(fields=['is_bestseller']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        return self.name
    
    def save(self, *args, **kwargs):
        # Generate SKU if not provided
        if not self.sku:
            self.sku = generate_sku(self.name, self.brand)
            # Ensure uniqueness
            counter = 1
            original_sku = self.sku
            while Product.objects.filter(sku=self.sku).exists():
                self.sku = f"{original_sku}-{counter:02d}"
                counter += 1
        
        # Generate slug if not provided
        if not self.slug:
            self.slug = slugify(self.name)
            # Ensure uniqueness for slug
            counter = 1
            original_slug = self.slug
            while Product.objects.filter(slug=self.slug).exclude(id=self.id).exists():
                self.slug = f"{original_slug}-{counter}"
                counter += 1
        
        # Set original price if not set
        if not self.original_price:
            self.original_price = self.price
            
        super().save(*args, **kwargs)
    
    @property
    def is_in_stock(self):
        """Check if product is in stock"""
        return self.stock_quantity > 0
    
    @property
    def is_low_stock(self):
        """Check if product is low in stock"""
        return self.stock_quantity <= self.min_stock_level
    
    @property
    def discount_percentage(self):
        """Calculate discount percentage if on sale"""
        if self.is_on_sale and self.original_price and self.original_price > self.price:
            return round(((self.original_price - self.price) / self.original_price) * 100, 1)
        return 0
    
    @property
    def final_price(self):
        """Get the final price (considering sales)"""
        return self.price
    
    def get_all_images(self):
        """Get all product images including ProductImage instances"""
        images = []
        
        # Add images from ProductImage model (ordered)
        for img in self.images.all().order_by('order'):
            images.append(img.image.url)
        
        # Add legacy image fields if they exist and aren't already included
        for field_name in ['main_image', 'image_2', 'image_3', 'image_4']:
            image = getattr(self, field_name)
            if image and image.url not in images:
                images.append(image.url)
        
        return images
    
    def get_main_image(self):
        """Get the main product image"""
        # First check ProductImage model for main image
        main_image = self.images.filter(is_main=True).first()
        if main_image:
            return main_image.image.url
        
        # Fall back to first ProductImage if no main is set
        first_image = self.images.first()
        if first_image:
            return first_image.image.url
        
        # Fall back to legacy main_image field
        if self.main_image:
            return self.main_image.url
        
        return None
    
    def increment_view_count(self):
        """Increment view count"""
        self.view_count += 1
        self.save(update_fields=['view_count'])
    
    def increment_sales_count(self):
        """Increment sales count"""
        self.sales_count += 1
        self.save(update_fields=['sales_count'])
    
    @property
    def average_rating(self):
        """Calculate average rating from approved reviews"""
        reviews = self.reviews.filter(status='approved')
        if not reviews:
            return 0
        return round(sum(review.rating for review in reviews) / reviews.count(), 1)
    
    @property
    def total_reviews(self):
        """Get total number of approved reviews"""
        return self.reviews.filter(status='approved').count()


class ProductImage(models.Model):
    """Model for storing multiple product images"""
    
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='images', verbose_name="Produto")
    image = models.ImageField(upload_to=product_image_upload_path, verbose_name="Imagem")
    alt_text = models.CharField(max_length=200, blank=True, verbose_name="Texto Alternativo")
    is_main = models.BooleanField(default=False, verbose_name="Imagem Principal")
    order = models.PositiveIntegerField(default=0, verbose_name="Ordem")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Criado em")
    
    class Meta:
        verbose_name = "Imagem do Produto"
        verbose_name_plural = "Imagens do Produto"
        ordering = ['order', 'created_at']
        indexes = [
            models.Index(fields=['product', 'is_main']),
            models.Index(fields=['product', 'order']),
        ]
    
    def __str__(self):
        return f"{self.product.name} - Imagem {self.order + 1}"
    
    def save(self, *args, **kwargs):
        # Auto-set order if not provided
        if self.order == 0 and self.product:
            last_image = ProductImage.objects.filter(product=self.product).order_by('order').last()
            if last_image:
                self.order = last_image.order + 1
            else:
                self.order = 1
        
        # Save the instance first
        super().save(*args, **kwargs)
        
        # If this is set as main image, unset other main images for this product
        if self.is_main and self.product:
            ProductImage.objects.filter(product=self.product, is_main=True).exclude(id=self.id).update(is_main=False)


class Favorite(models.Model):
    """Model for user favorites"""
    user = models.ForeignKey('auth.User', on_delete=models.CASCADE, related_name='favorites', verbose_name="Usuário")
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='favorited_by', verbose_name="Produto")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Favoritado em")
    
    class Meta:
        verbose_name = "Favorito"
        verbose_name_plural = "Favoritos"
        unique_together = ('user', 'product')  # Prevent duplicate favorites
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.user.username} - {self.product.name}"


class Review(models.Model):
    """Model for product reviews"""
    STATUS_CHOICES = [
        ('pending', 'Pendente'),
        ('approved', 'Aprovado'),
        ('rejected', 'Rejeitado')
    ]
    
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='reviews', verbose_name="Produto")
    user = models.ForeignKey('auth.User', on_delete=models.CASCADE, related_name='reviews', verbose_name="Usuário")
    rating = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        verbose_name="Avaliação",
        help_text="Avaliação de 1 a 5 estrelas"
    )
    comment = models.TextField(blank=True, verbose_name="Comentário")
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending',
        verbose_name="Status",
        db_index=True
    )
    moderated_by = models.ForeignKey(
        'auth.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='moderated_reviews',
        verbose_name="Moderado por"
    )
    moderated_at = models.DateTimeField(null=True, blank=True, verbose_name="Data da Moderação")
    moderation_notes = models.TextField(blank=True, verbose_name="Notas da Moderação")
    admin_seen = models.BooleanField(default=False, db_index=True, verbose_name="Visto pelo Admin")
    helpful_count = models.PositiveIntegerField(default=0, db_index=True, verbose_name="Votos úteis")
    created_at = models.DateTimeField(default=timezone.now, verbose_name="Criado em")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Atualizado em")
    
    class Meta:
        verbose_name = "Avaliação"
        verbose_name_plural = "Avaliações"
        ordering = ['-created_at']
        # unique_together removido para permitir múltiplas avaliações por usuário/produto
        
    def __str__(self):
        return f"Avaliação de {self.user.username} para {self.product.name}"


class ReviewImage(models.Model):
    """Images attached to a product review for social proof"""
    review = models.ForeignKey(Review, on_delete=models.CASCADE, related_name='images', verbose_name="Avaliação")
    image = models.ImageField(upload_to=review_image_upload_path, verbose_name="Imagem")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Enviado em")

    class Meta:
        verbose_name = "Imagem da Avaliação"
        verbose_name_plural = "Imagens das Avaliações"
        ordering = ['id']

    def __str__(self):
        return f"Imagem da avaliação #{self.review_id}"


class ReviewHelpfulVote(models.Model):
    """Track users who voted a review as helpful to prevent multiple votes."""
    review = models.ForeignKey(Review, on_delete=models.CASCADE, related_name='helpful_votes', verbose_name="Avaliação")
    user = models.ForeignKey('auth.User', on_delete=models.CASCADE, related_name='review_helpful_votes', verbose_name="Usuário")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Votado em")

    class Meta:
        verbose_name = "Voto Útil da Avaliação"
        verbose_name_plural = "Votos Úteis das Avaliações"
        unique_together = ('review', 'user')
        indexes = [
            models.Index(fields=['review', 'user'])
        ]

    def __str__(self):
        return f"{self.user_id} votou útil na review {self.review_id}"
