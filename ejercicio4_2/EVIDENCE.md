=== EJERCICIO 4.2 - PRUEBA FINAL ===

## Estado con Contraseña Correcta

NAME                              READY   STATUS    RESTARTS        AGE     IP           NODE                                         NOMINATED NODE   READINESS GATES
the-project-app-555b9fc87-m8w8z   0/1     Running   2 (80s ago)     4m19s   10.84.2.18   gke-dwk-cluster-default-pool-567416e5-8qcx   <none>           <none>
the-project-app-555b9fc87-qlfjk   0/1     Running   1 (2m28s ago)   4m20s   10.84.0.11   gke-dwk-cluster-default-pool-567416e5-2hl5   <none>           <none>
the-project-app-555b9fc87-rgv8q   0/1     Running   1 (2m29s ago)   4m19s   10.84.0.10   gke-dwk-cluster-default-pool-567416e5-2hl5   <none>           <none>
the-project-app-555b9fc87-vpn4n   1/1     Running   0               4m19s   10.84.1.13   gke-dwk-cluster-default-pool-567416e5-w6n1   <none>           <none>

## Estado con Contraseña Incorrecta

NAME                                           READY   STATUS    RESTARTS   AGE    IP           NODE                                         NOMINATED NODE   READINESS GATES
the-project-app-test-broken-5cf9498d9d-6wjjk   0/1     Running   0          105s   10.84.0.12   gke-dwk-cluster-default-pool-567416e5-2hl5   <none>           <none>
the-project-app-test-broken-5cf9498d9d-fktpx   1/1     Running   0          105s   10.84.1.14   gke-dwk-cluster-default-pool-567416e5-w6n1   <none>           <none>

## Deployments Finales

NAME                          READY   UP-TO-DATE   AVAILABLE   AGE
the-project-app               1/4     4            1           9m5s
the-project-app-test-broken   1/2     2            1           106s
