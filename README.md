# presentia

Application interne de gestion du personnel pour adiva

# Mot de passe provisoire : points a brancher

1. Migration : copier dans database/migrations, puis `php artisan migrate`.
2. Modele User : ajouter le cast `'doit_changer_mot_de_passe' => 'boolean'`.
3. Middleware : enregistrer ForcerChangementMotDePasse (voir l'en-tete du fichier).
4. Apres un changement de mot de passe REUSSI par l'utilisateur lui-meme
   (controleur de mise a jour du mot de passe) :
   $request->user()->forceFill(['doit_changer_mot_de_passe' => false])->save();
5. Quand l'administrateur CREE un compte ou REINITIALISE un mot de passe pour quelqu'un :
   $utilisateur->forceFill([
   'password' => Hash::make($motDePasseProvisoire),
   'doit_changer_mot_de_passe' => true,
   ])->save();
   Le mot de passe provisoire est genere par le systeme (Str::password(12)),
   affiche une seule fois a l'administrateur, jamais envoye par e-mail ni journalise.
6. AdministrateurSeeder : le compte cree prend la valeur par defaut (true), donc
   le directeur change aussi son mot de passe a la premiere connexion.
