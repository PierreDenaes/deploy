import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { FileText } from 'lucide-react';

interface TermsAndConditionsModalProps {
  children: React.ReactNode;
}

const TermsAndConditionsModal: React.FC<TermsAndConditionsModalProps> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Termes et Conditions d'Utilisation
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[60vh] pr-4">
          <div className="space-y-6 text-sm text-muted-foreground">
            
            {/* Introduction */}
            <section>
              <h3 className="text-base font-semibold text-foreground mb-3">
                1. Acceptation des Conditions
              </h3>
              <p>
                En utilisant l'application DynProt, vous acceptez d'être lié par ces termes et conditions. 
                Si vous n'acceptez pas ces conditions, veuillez ne pas utiliser notre service.
              </p>
            </section>

            {/* Définitions */}
            <section>
              <h3 className="text-base font-semibold text-foreground mb-3">
                2. Définitions
              </h3>
              <ul className="space-y-2 list-disc list-inside">
                <li><strong>"Service"</strong> : L'application mobile et web DynProt de suivi nutritionnel</li>
                <li><strong>"Utilisateur"</strong> : Toute personne utilisant le Service</li>
                <li><strong>"Données"</strong> : Informations nutritionnelles et personnelles saisies par l'Utilisateur</li>
                <li><strong>"IA"</strong> : Intelligence artificielle utilisée pour l'analyse nutritionnelle</li>
              </ul>
            </section>

            {/* Services fournis */}
            <section>
              <h3 className="text-base font-semibold text-foreground mb-3">
                3. Description du Service
              </h3>
              <p className="mb-3">
                DynProt fournit un service de suivi nutritionnel comprenant :
              </p>
              <ul className="space-y-2 list-disc list-inside">
                <li>Enregistrement et analyse des repas</li>
                <li>Calcul automatique des valeurs nutritionnelles via IA</li>
                <li>Tableaux de bord et analyses de progression</li>
                <li>Recommandations personnalisées</li>
                <li>Export de données nutritionnelles</li>
              </ul>
            </section>

            {/* Responsabilités de l'utilisateur */}
            <section>
              <h3 className="text-base font-semibold text-foreground mb-3">
                4. Responsabilités de l'Utilisateur
              </h3>
              <p className="mb-3">En utilisant DynProt, vous vous engagez à :</p>
              <ul className="space-y-2 list-disc list-inside">
                <li>Fournir des informations exactes et à jour</li>
                <li>Utiliser le Service de manière légale et éthique</li>
                <li>Ne pas tenter de compromettre la sécurité du Service</li>
                <li>Respecter les droits de propriété intellectuelle</li>
                <li>Consulter un professionnel de santé pour les décisions médicales</li>
              </ul>
            </section>

            {/* Données personnelles */}
            <section>
              <h3 className="text-base font-semibold text-foreground mb-3">
                5. Protection des Données Personnelles
              </h3>
              <p className="mb-3">
                Nous nous engageons à protéger vos données personnelles conformément au RGPD :
              </p>
              <ul className="space-y-2 list-disc list-inside">
                <li>Collecte limitée aux données nécessaires au Service</li>
                <li>Chiffrement et sécurisation de toutes les données</li>
                <li>Pas de vente ou partage avec des tiers sans consentement</li>
                <li>Droit d'accès, rectification et suppression de vos données</li>
                <li>Conservation limitée dans le temps</li>
              </ul>
            </section>

            {/* IA et précision */}
            <section>
              <h3 className="text-base font-semibold text-foreground mb-3">
                6. Intelligence Artificielle et Précision
              </h3>
              <p className="mb-3">
                Notre système d'IA fournit des estimations nutritionnelles basées sur l'analyse d'images et de descriptions. 
                Ces estimations sont données à titre indicatif et peuvent présenter des variations par rapport aux valeurs réelles.
              </p>
              <p>
                Nous recommandons de consulter un professionnel de la nutrition pour des conseils personnalisés 
                et de vérifier les informations critiques.
              </p>
            </section>

            {/* Propriété intellectuelle */}
            <section>
              <h3 className="text-base font-semibold text-foreground mb-3">
                7. Propriété Intellectuelle
              </h3>
              <p>
                Tous les éléments du Service (code, design, algorithmes, contenu) sont protégés par les droits 
                de propriété intellectuelle. Vous obtenez uniquement une licence d'utilisation non-exclusive 
                et non-transférable du Service.
              </p>
            </section>

            {/* Limitation de responsabilité */}
            <section>
              <h3 className="text-base font-semibold text-foreground mb-3">
                8. Limitation de Responsabilité
              </h3>
              <p className="mb-3">
                DynProt est fourni "en l'état" sans garantie. Nous ne sommes pas responsables de :
              </p>
              <ul className="space-y-2 list-disc list-inside">
                <li>L'exactitude absolue des estimations nutritionnelles</li>
                <li>Les décisions de santé prises sur la base du Service</li>
                <li>Les interruptions temporaires du Service</li>
                <li>La perte de données due à des facteurs externes</li>
              </ul>
            </section>

            {/* Résiliation */}
            <section>
              <h3 className="text-base font-semibold text-foreground mb-3">
                9. Résiliation
              </h3>
              <p>
                Vous pouvez cesser d'utiliser le Service à tout moment. Nous nous réservons le droit 
                de suspendre ou résilier votre accès en cas de violation de ces conditions. 
                En cas de résiliation, vos données seront conservées selon notre politique de rétention.
              </p>
            </section>

            {/* Modifications */}
            <section>
              <h3 className="text-base font-semibold text-foreground mb-3">
                10. Modifications des Conditions
              </h3>
              <p>
                Ces conditions peuvent être modifiées périodiquement. Les modifications importantes 
                vous seront notifiées via l'application. L'utilisation continue du Service après 
                modification constitue une acceptation des nouvelles conditions.
              </p>
            </section>

            {/* Droit applicable */}
            <section>
              <h3 className="text-base font-semibold text-foreground mb-3">
                11. Droit Applicable
              </h3>
              <p>
                Ces conditions sont régies par le droit français. Tout litige sera soumis 
                à la juridiction des tribunaux français compétents.
              </p>
            </section>

            {/* Contact */}
            <section>
              <h3 className="text-base font-semibold text-foreground mb-3">
                12. Contact
              </h3>
              <p>
                Pour toute question concernant ces conditions d'utilisation, 
                vous pouvez nous contacter à l'adresse : <strong>legal@dynprot.com</strong>
              </p>
              <p className="mt-2 text-xs">
                Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}
              </p>
            </section>

          </div>
        </ScrollArea>
        <div className="flex justify-end pt-4">
          <Button onClick={() => setIsOpen(false)}>
            Fermer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TermsAndConditionsModal;