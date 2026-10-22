<template>
    <header class="navbar">
        <div class="navbar-logo">
            <RouterLink to="/">
                <img src="@/assets/pasionaria.png" alt="Logo de Pasionaria" />
            </RouterLink>
        </div>
        <div class="navbar-menu">
            <ul>
                <li><RouterLink to="/">Productos</RouterLink></li>
                <li><a href="#contacto">Contacto</a></li>
                <li><RouterLink to="/carrito" class="navbar-marketcart">Carrito</RouterLink></li>
            </ul>
        </div>
    </header>
</template>

<style lang="scss" scoped>
.navbar{
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-inline: 1rem;
  background-color: #faae51;
  &-logo{
    height: auto;
    width: 200px;
    img{
      object-fit: cover;
      width: 100%;
      height: 100%;
    }
  }
  &-menu{
    ul{
      display: flex;
      list-style: none;
      gap: 1rem;
      margin: auto;
      li{
        a{
          text-decoration: none;
          color: #434300;
          font-weight: bold;
          transition: .5s;
          &:hover{
            color: #696902;
          }
        }
      }
    }
  }
}
</style>