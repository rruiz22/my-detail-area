# Page snapshot

```yaml
- generic [ref=e2]:
  - region "Notifications (F8)":
    - list
  - region "Notifications alt+T"
  - generic [ref=e3]:
    - generic [ref=e4]:
      - button "English" [ref=e5] [cursor=pointer]:
        - img "English" [ref=e6] [cursor=pointer]
      - button "common.toggle_theme" [ref=e7] [cursor=pointer]:
        - img
        - img
        - generic [ref=e8] [cursor=pointer]: common.toggle_theme
    - generic [ref=e9]:
      - generic [ref=e10]:
        - generic [ref=e12]: M
        - heading "My Detail Area" [level=1] [ref=e13]
        - paragraph [ref=e14]: Dealership Operations Hub
      - generic [ref=e15]:
        - generic [ref=e16]:
          - heading "Welcome back" [level=3] [ref=e17]
          - paragraph [ref=e18]: Sign in to your account
        - generic [ref=e19]:
          - generic [ref=e20]:
            - generic [ref=e21]:
              - generic [ref=e22]: Email address
              - textbox "Email address" [ref=e23]: rruiz@lima.llc
            - generic [ref=e24]:
              - generic [ref=e25]: Password
              - textbox "Password" [ref=e26]: testpassword123
            - button "Sign In" [ref=e27] [cursor=pointer]
          - paragraph [ref=e29]: Don't have access? Contact your dealer administrator.
      - paragraph [ref=e31]: © 2024 My Detail Area. Dealership operations platform.
```