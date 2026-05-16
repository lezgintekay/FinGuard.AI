using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FinGuard.API.Migrations
{
    /// <inheritdoc />
    public partial class AddTaksitToFatura : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "OdenenTaksit",
                table: "Faturalar",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<bool>(
                name: "TaksitliMi",
                table: "Faturalar",
                type: "INTEGER",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "ToplamTaksit",
                table: "Faturalar",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "OdenenTaksit",
                table: "Faturalar");

            migrationBuilder.DropColumn(
                name: "TaksitliMi",
                table: "Faturalar");

            migrationBuilder.DropColumn(
                name: "ToplamTaksit",
                table: "Faturalar");
        }
    }
}
