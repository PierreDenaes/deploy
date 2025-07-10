#!/usr/bin/env ts-node
// Script d'import de la base OpenFoodFacts CSV vers PostgreSQL

import fs from 'fs';
import csv from 'csv-parser';
import prisma from '../lib/prisma';

interface OpenFoodFactsProduct {
  code: string;
  product_name: string;
  brands: string;
  categories: string;
  'energy-kcal_100g': number;
  proteins_100g: number;
  carbohydrates_100g: number;
  fat_100g: number;
  fiber_100g: number;
  sodium_100g: number;
  countries: string;
}

export class OpenFoodFactsImporter {
  
  static async importFromCSV(filePath: string) {
    console.log('🚀 Démarrage import OpenFoodFacts...');
    
    let imported = 0;
    let errors = 0;
    const batchSize = 1000;
    let batch: any[] = [];

    return new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv({
          separator: '\t' // OpenFoodFacts utilise des tabulations
        }))
        .on('data', async (row) => {
          try {
            // Nettoyer et valider les données
            const product = this.cleanProductData(row);
            
            if (this.isValidProduct(product)) {
              batch.push(product);
              
              // Traitement par batch pour optimiser
              if (batch.length >= batchSize) {
                await this.processBatch(batch);
                imported += batch.length;
                batch = [];
                console.log(`✅ Importé: ${imported} produits`);
              }
            }
          } catch (error) {
            errors++;
            if (errors % 100 === 0) {
              console.warn(`⚠️ Erreurs: ${errors}`);
            }
          }
        })
        .on('end', async () => {
          // Traiter le dernier batch
          if (batch.length > 0) {
            await this.processBatch(batch);
            imported += batch.length;
          }
          
          console.log(`🎉 Import terminé: ${imported} produits importés, ${errors} erreurs`);
          resolve({ imported, errors });
        })
        .on('error', reject);
    });
  }

  private static cleanProductData(row: any): OpenFoodFactsProduct {
    return {
      code: row.code?.trim() || '',
      product_name: row.product_name?.trim() || '',
      brands: row.brands?.trim() || '',
      categories: row.categories?.trim() || '',
      'energy-kcal_100g': this.parseFloat(row['energy-kcal_100g']),
      proteins_100g: this.parseFloat(row.proteins_100g),
      carbohydrates_100g: this.parseFloat(row.carbohydrates_100g),
      fat_100g: this.parseFloat(row.fat_100g),
      fiber_100g: this.parseFloat(row.fiber_100g),
      sodium_100g: this.parseFloat(row.sodium_100g),
      countries: row.countries?.trim() || ''
    };
  }

  private static parseFloat(value: string): number {
    if (!value || value === '') return 0;
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  }

  private static isValidProduct(product: OpenFoodFactsProduct): boolean {
    return !!(
      product.code &&
      product.product_name &&
      product.product_name.length > 2 &&
      (product.proteins_100g > 0 || product['energy-kcal_100g'] > 0)
    );
  }

  private static async processBatch(products: OpenFoodFactsProduct[]) {
    try {
      // Utiliser createMany pour l'efficacité
      await prisma.openfoodfacts_products.createMany({
        data: products.map(p => ({
          barcode: p.code,
          product_name: p.product_name,
          brands: p.brands,
          categories: p.categories,
          energy_100g: p['energy-kcal_100g'],
          proteins_100g: p.proteins_100g,
          carbohydrates_100g: p.carbohydrates_100g,
          fat_100g: p.fat_100g,
          fiber_100g: p.fiber_100g,
          sodium_100g: p.sodium_100g,
          countries: p.countries,
          created_at: new Date(),
          updated_at: new Date()
        })),
        skipDuplicates: true // Éviter les doublons
      });
    } catch (error) {
      console.error('❌ Erreur batch:', error);
      throw error;
    }
  }
}

// Script principal
async function main() {
  const csvPath = process.argv[2];
  
  if (!csvPath) {
    console.error('❌ Usage: ts-node import-openfoodfacts.ts <chemin-vers-csv>');
    process.exit(1);
  }

  if (!fs.existsSync(csvPath)) {
    console.error('❌ Fichier CSV non trouvé:', csvPath);
    process.exit(1);
  }

  try {
    await OpenFoodFactsImporter.importFromCSV(csvPath);
    console.log('🎉 Import terminé avec succès');
  } catch (error) {
    console.error('❌ Erreur import:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}