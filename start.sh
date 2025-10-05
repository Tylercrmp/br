#!/bin/bash

# Переход в проект
cd ~/BRONLINE/BRONLINE || exit

# Пересборка проекта
npm run build

# Запуск собранного сайта
serve -s dist
