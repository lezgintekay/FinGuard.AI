using FinGuard.API.Data;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite("Data Source=finguard.db"));

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddControllers();
// Gemini servisimizi HTTP Client yetenekleriyle birlikte sisteme kaydediyoruz
builder.Services.AddHttpClient<FinGuard.API.Services.GeminiService>();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.MapControllers();

// Veritabanı Seed İşlemi
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    var context = services.GetRequiredService<AppDbContext>();
    // Veritabanı yoksa oluşturur, varsa günceller
    context.Database.Migrate(); 
    // Sahte verilerimizi basar
    DbSeeder.SeedData(context);
}

app.Run();