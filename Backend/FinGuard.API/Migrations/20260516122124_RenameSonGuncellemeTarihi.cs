using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FinGuard.API.Migrations
{
    /// <inheritdoc />
    public partial class RenameSonGuncellemeTarihi : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "SonGuncellemeTarihi",
                table: "Hesaplar",
                newName: "SonGuncellenmeTarihi");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "SonGuncellenmeTarihi",
                table: "Hesaplar",
                newName: "SonGuncellemeTarihi");
        }
    }
}
