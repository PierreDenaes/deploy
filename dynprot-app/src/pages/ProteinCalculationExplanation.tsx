import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Brain, Calculator, BookOpen, ExternalLink, Target, Zap, User, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';

const ProteinCalculationExplanation = () => {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate(-1);
  };

  const methodologySteps = [
    {
      title: "Métabolisme de Base (BMR)",
      description: "Calcul des calories nécessaires au repos",
      formula: "Équation de Mifflin-St Jeor",
      details: "Hommes: (10 × poids) + (6.25 × taille) - (5 × âge) + 5\nFemmes: (10 × poids) + (6.25 × taille) - (5 × âge) - 161",
      icon: <User className="h-5 w-5" />
    },
    {
      title: "Dépense Énergétique Totale (TDEE)",
      description: "BMR ajusté selon le niveau d'activité",
      formula: "BMR × Multiplicateur d'activité",
      details: "Sédentaire: 1.2\nLéger: 1.375\nModéré: 1.55\nTrès actif: 1.725\nExtrêmement actif: 1.9",
      icon: <Activity className="h-5 w-5" />
    },
    {
      title: "Ajustement Objectifs",
      description: "Modification selon les objectifs fitness",
      formula: "TDEE × Facteur objectif",
      details: "Perte de poids: -15-20%\nMaintien: ±0%\nGain musculaire: +10-15%",
      icon: <Target className="h-5 w-5" />
    },
    {
      title: "Besoins en Protéines",
      description: "Calcul basé sur le poids et l'objectif",
      formula: "Poids × Multiplicateur protéine",
      details: "Perte de poids: 1.6-2.2g/kg\nGain musculaire: 2.0-2.4g/kg\nMaintien: 1.2-1.8g/kg\nEndurance: 1.4g/kg",
      icon: <Zap className="h-5 w-5" />
    }
  ];

  const scientificSources = [
    {
      title: "Position of the Academy of Nutrition and Dietetics: Protein Intake for Optimal Muscle Maintenance",
      authors: "Rodriguez, N.R., et al.",
      journal: "Journal of the Academy of Nutrition and Dietetics",
      year: "2015",
      link: "https://doi.org/10.1016/j.jand.2015.06.369"
    },
    {
      title: "International Society of Sports Nutrition Position Stand: Protein and Exercise",
      authors: "Kerksick, C.M., et al.",
      journal: "Journal of the International Society of Sports Nutrition",
      year: "2018",
      link: "https://doi.org/10.1186/s12970-018-0215-1"
    },
    {
      title: "A systematic review, meta-analysis and meta-regression of the effect of protein supplementation on resistance training-induced gains in muscle mass and strength in healthy adults",
      authors: "Morton, R.W., et al.",
      journal: "British Journal of Sports Medicine",
      year: "2018",
      link: "https://doi.org/10.1136/bjsports-2017-097608"
    },
    {
      title: "The role of protein in weight loss and maintenance",
      authors: "Leidy, H.J., et al.",
      journal: "American Journal of Clinical Nutrition",
      year: "2015",
      link: "https://doi.org/10.3945/ajcn.114.084038"
    }
  ];

  const adjustmentFactors = [
    {
      factor: "Âge",
      description: "Les adultes de plus de 50 ans ont des besoins protéiques augmentés (+10-20%)",
      reasoning: "Résistance anabolique et sarcopénie liée à l'âge"
    },
    {
      factor: "Genre",
      description: "Légère augmentation pour les hommes (+5%)",
      reasoning: "Masse musculaire généralement plus élevée"
    },
    {
      factor: "Composition corporelle",
      description: "Calcul basé sur la masse maigre si pourcentage de graisse connu",
      reasoning: "Les protéines sont principalement utilisées par les tissus actifs"
    },
    {
      factor: "Fréquence d'entraînement",
      description: "Augmentation progressive selon les jours d'entraînement",
      reasoning: "Besoins accrus de récupération et synthèse protéique"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container max-w-4xl mx-auto p-4 pb-32">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="space-y-8"
        >
          {/* Header */}
          <div className="flex items-center gap-4 pt-8">
            <Button
              variant="outline"
              size="icon"
              onClick={handleBack}
              className="h-10 w-10"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Méthodologie du Calcul Nutritionnel
              </h1>
              <p className="text-muted-foreground">
                Comprendre les bases scientifiques de nos recommandations
              </p>
            </div>
          </div>

          {/* Overview */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-6 w-6 text-primary" />
                Vue d'ensemble
              </CardTitle>
              <CardDescription>
                Notre calculateur utilise des équations scientifiquement validées pour déterminer vos besoins nutritionnels optimaux.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert className="bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-700 dark:text-blue-200">
                <Calculator className="h-4 w-4" />
                <AlertDescription>
                  <strong>Approche evidence-based :</strong> Toutes nos formules sont basées sur la recherche scientifique actuelle 
                  et les recommandations des organismes internationaux de nutrition sportive.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* Methodology Steps */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-6 w-6 text-primary" />
                Méthodologie de Calcul
              </CardTitle>
              <CardDescription>
                Les quatre étapes de notre algorithme de recommandation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {methodologySteps.map((step, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  className="space-y-3"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                      {step.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-lg">{step.title}</h3>
                        <Badge variant="outline">{step.formula}</Badge>
                      </div>
                      <p className="text-muted-foreground mb-3">{step.description}</p>
                      <div className="bg-muted/50 rounded-lg p-3">
                        <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono">
                          {step.details}
                        </pre>
                      </div>
                    </div>
                  </div>
                  {index < methodologySteps.length - 1 && <Separator />}
                </motion.div>
              ))}
            </CardContent>
          </Card>

          {/* Adjustment Factors */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-6 w-6 text-primary" />
                Facteurs d'Ajustement
              </CardTitle>
              <CardDescription>
                Comment nous personnalisons les recommandations selon votre profil
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {adjustmentFactors.map((factor, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className="p-4 border rounded-lg hover:bg-muted/30 transition-colors"
                >
                  <h4 className="font-medium text-base mb-1">{factor.factor}</h4>
                  <p className="text-sm text-muted-foreground mb-2">{factor.description}</p>
                  <p className="text-xs text-muted-foreground italic">
                    <strong>Justification :</strong> {factor.reasoning}
                  </p>
                </motion.div>
              ))}
            </CardContent>
          </Card>

          {/* Scientific Sources */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-6 w-6 text-primary" />
                Sources Scientifiques
              </CardTitle>
              <CardDescription>
                Références académiques utilisées pour développer nos algorithmes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {scientificSources.map((source, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className="p-4 border rounded-lg hover:bg-muted/30 transition-colors"
                >
                  <h4 className="font-medium text-base mb-2 leading-tight">
                    {source.title}
                  </h4>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <Badge variant="secondary">{source.authors}</Badge>
                    <Badge variant="outline">{source.year}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    <em>{source.journal}</em>
                  </p>
                  <a
                    href={source.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    Voir la publication
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </motion.div>
              ))}
            </CardContent>
          </Card>

          {/* Disclaimer */}
          <Card className="border-0 shadow-lg border-orange-200 bg-orange-50 dark:bg-orange-900/20 dark:border-orange-800">
            <CardContent className="pt-6">
              <Alert className="border-orange-300 bg-transparent">
                <AlertDescription className="text-orange-800 dark:text-orange-200">
                  <strong>Avertissement médical :</strong> Ces recommandations sont à titre informatif uniquement. 
                  Consultez toujours un professionnel de la santé avant de modifier significativement votre alimentation, 
                  surtout si vous avez des conditions médicales particulières.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* Call to Action */}
          <div className="text-center pt-8">
            <Button onClick={() => navigate('/profile')} size="lg" className="h-12 px-8">
              Retourner au Calculateur
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ProteinCalculationExplanation;